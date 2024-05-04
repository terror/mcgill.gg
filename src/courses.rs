use super::*;

#[derive(Deserialize)]
pub(crate) struct GetCoursesParams {
  limit: Option<i64>,
  offset: Option<u64>,
  with_course_count: Option<bool>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GetCoursesPayload {
  pub(crate) courses: Vec<Course>,
  pub(crate) course_count: Option<u32>,
}

pub(crate) async fn get_courses(
  Query(params): Query<GetCoursesParams>,
  AppState(db): AppState<Arc<Db>>,
  filter: Json<CourseFilter>,
) -> Result<impl IntoResponse> {
  Ok(Json(GetCoursesPayload {
    courses: db
      .courses(params.limit, params.offset, Some(filter.0))
      .await?,
    course_count: if params.with_course_count.unwrap_or(false) {
      Some(db.course_count().await?)
    } else {
      None
    },
  }))
}

#[derive(Debug, Deserialize)]
pub(crate) struct GetCourseParams {
  with_reviews: Option<bool>,
}

#[typeshare]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GetCoursePayload {
  pub(crate) course: Course,
  pub(crate) reviews: Option<Vec<Review>>,
}

pub(crate) async fn get_course_by_id(
  Path(id): Path<String>,
  Query(params): Query<GetCourseParams>,
  AppState(state): AppState<State>,
) -> Result<impl IntoResponse> {
  Ok(match state.db.find_course_by_id(&id).await? {
    Some(course) => {
      let mut reviews = params
        .with_reviews
        .unwrap_or(false)
        .then_some(state.db.find_reviews_by_course_id(&id).await?);

      if let Some(ref mut reviews) = reviews {
        reviews.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        return Ok((
          StatusCode::OK,
          Json(Some(GetCoursePayload {
            course,
            reviews: Some(reviews.clone()),
          })),
        ));
      }

      (
        StatusCode::OK,
        Json(Some(GetCoursePayload {
          course,
          reviews: None,
        })),
      )
    }
    None => (StatusCode::NOT_FOUND, Json(None)),
  })
}
