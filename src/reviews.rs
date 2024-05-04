use super::*;

#[derive(Debug, Deserialize)]
pub(crate) struct GetReviewsParams {
  pub(crate) course_id: Option<String>,
  pub(crate) instructor_name: Option<String>,
  pub(crate) limit: Option<i64>,
  pub(crate) offset: Option<u64>,
  pub(crate) sorted: Option<bool>,
  pub(crate) user_id: Option<String>,
  pub(crate) with_user_count: Option<bool>,
}

#[typeshare]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GetReviewsPayload {
  pub reviews: Vec<Review>,
  pub unique_user_count: Option<u32>,
}

pub(crate) async fn get_reviews(
  params: Query<GetReviewsParams>,
  AppState(db): AppState<Arc<Db>>,
) -> Result<impl IntoResponse> {
  Ok(Json(GetReviewsPayload {
    reviews: db
      .reviews(
        params.limit,
        params.offset,
        Some(ReviewFilter {
          course_id: params.course_id.clone(),
          instructor_name: params.instructor_name.clone(),
          sorted: params.sorted,
          user_id: params.user_id.clone(),
        }),
      )
      .await?,
    unique_user_count: if params.with_user_count.unwrap_or(false) {
      Some(db.unique_user_count().await?)
    } else {
      None
    },
  }))
}

pub(crate) async fn get_review(
  user: User,
  Path(id): Path<String>,
  AppState(db): AppState<Arc<Db>>,
) -> Result<impl IntoResponse> {
  Ok(Json(db.find_review(&id, &user.id()).await?))
}

#[derive(Debug, Deserialize)]
pub(crate) struct AddOrUpdateReviewBody {
  pub(crate) content: String,
  pub(crate) course_id: String,
  pub(crate) instructors: Vec<String>,
  pub(crate) rating: u32,
  pub(crate) difficulty: u32,
}

pub(crate) async fn add_review(
  AppState(db): AppState<Arc<Db>>,
  user: User,
  body: Json<AddOrUpdateReviewBody>,
) -> Result<impl IntoResponse> {
  let AddOrUpdateReviewBody {
    content,
    course_id,
    instructors,
    rating,
    difficulty,
  } = body.0;

  trace!("Adding review to database...");

  validate_instructors(db.clone(), &course_id, &instructors).await?;

  let review = Review {
    content,
    course_id: course_id.clone(),
    instructors,
    rating,
    difficulty,
    timestamp: Utc::now().into(),
    user_id: user.id(),
    ..Review::default()
  };

  db.add_review(review.clone()).await?;

  info!("Adding notifications for course {}...", &course_id);

  db.add_notifications(review).await?;

  Ok(())
}

pub(crate) async fn update_review(
  AppState(db): AppState<Arc<Db>>,
  user: User,
  body: Json<AddOrUpdateReviewBody>,
) -> Result<impl IntoResponse> {
  let AddOrUpdateReviewBody {
    content,
    course_id,
    instructors,
    rating,
    difficulty,
  } = body.0;

  validate_instructors(db.clone(), &course_id, &instructors).await?;

  trace!("Updating review...");

  let user_id = user.id();

  let review = Review {
    content,
    course_id: course_id.clone(),
    instructors,
    rating,
    difficulty,
    timestamp: Utc::now().into(),
    user_id: user_id.clone(),
    ..Review::default()
  };

  db.add_review(review.clone()).await?;

  db.update_notifications(&user_id, &course_id, review)
    .await?;

  Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct DeleteReviewBody {
  course_id: String,
}

pub(crate) async fn delete_review(
  AppState(db): AppState<Arc<Db>>,
  user: User,
  body: Json<DeleteReviewBody>,
) -> Result<impl IntoResponse> {
  trace!("Deleting review from the database...");

  let user_id = user.id();

  db.delete_review(&body.course_id, &user_id).await?;
  db.delete_interactions(&body.course_id, &user_id).await?;
  db.delete_notifications(&user_id, &body.course_id).await?;

  Ok(())
}

async fn validate_instructors(
  db: Arc<Db>,
  course_id: &str,
  instructors: &[String],
) -> Result {
  let course = db
    .find_course_by_id(course_id)
    .await?
    .ok_or(anyhow!("Failed to find course with id: {}", course_id))?;

  let mut valid_instructors = course
    .instructors
    .into_iter()
    .map(|ins| ins.name)
    .collect::<Vec<String>>();

  valid_instructors.push("Other".into());

  if !instructors
    .iter()
    .all(|ins| valid_instructors.contains(ins))
  {
    return Err(anyhow!("Invalid instructor(s)").into());
  }

  Ok(())
}
