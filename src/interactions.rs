use super::*;

#[derive(Debug, Deserialize)]
pub(crate) struct GetInteractionKindParams {
  pub(crate) course_id: String,
  pub(crate) user_id: String,
  pub(crate) referrer: String,
}

#[typeshare]
#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub(crate) struct GetInteractionKindPayload {
  pub(crate) kind: Option<InteractionKind>,
}

pub(crate) async fn get_interaction_kind(
  params: Query<GetInteractionKindParams>,
  AppState(db): AppState<Arc<Db>>,
) -> Result<impl IntoResponse> {
  let kind = db
    .interaction_kind(&params.course_id, &params.user_id, &params.referrer)
    .await?;

  Ok(Json(GetInteractionKindPayload { kind }))
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub(crate) struct GetUserInteractionForCoursePayload {
  pub(crate) course_id: String,
  pub(crate) referrer: String,
  pub(crate) interactions: Vec<Interaction>,
}

pub(crate) async fn get_user_interactions_for_course(
  Path((course_id, referrer)): Path<(String, String)>,
  AppState(db): AppState<Arc<Db>>,
) -> Result<impl IntoResponse> {
  info!(
    "Fetching review interactions from {} for course {}",
    referrer, course_id
  );

  Ok(Json(GetUserInteractionForCoursePayload {
    course_id: course_id.clone(),
    referrer: referrer.clone(),
    interactions: db
      .user_interactions_for_course(&course_id, &referrer)
      .await?,
  }))
}

#[typeshare]
#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub(crate) struct GetCourseReviewsInteractionPayload {
  pub(crate) course_id: String,
  pub(crate) interactions: Vec<Interaction>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct AddInteractionBody {
  kind: InteractionKind,
  course_id: String,
  user_id: String,
  referrer: String,
}

pub(crate) async fn add_interaction(
  AppState(db): AppState<Arc<Db>>,
  _user: User,
  body: Json<AddInteractionBody>,
) -> Result<impl IntoResponse> {
  info!(
    "Adding interaction for review {}/{}...",
    body.course_id, body.user_id
  );

  db.add_interaction(Interaction {
    kind: body.kind.clone(),
    course_id: body.course_id.clone(),
    user_id: body.user_id.clone(),
    referrer: body.referrer.clone(),
  })
  .await?;

  Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct DeleteInteractionBody {
  course_id: String,
  user_id: String,
  referrer: String,
}

pub(crate) async fn delete_interaction(
  AppState(db): AppState<Arc<Db>>,
  _user: User,
  body: Json<DeleteInteractionBody>,
) -> Result<impl IntoResponse> {
  info!(
    "Removing interaction for review {}/{}...",
    body.course_id, body.user_id
  );

  db.delete_interaction(&body.course_id, &body.user_id, &body.referrer)
    .await?;

  Ok(())
}
