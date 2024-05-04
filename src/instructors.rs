use super::*;

#[typeshare]
#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct GetInstructorPayload {
  pub(crate) instructor: Option<Instructor>,
  pub(crate) reviews: Vec<Review>,
}

pub(crate) async fn get_instructor(
  Path(name): Path<String>,
  AppState(db): AppState<Arc<Db>>,
) -> Result<impl IntoResponse> {
  info!("Fetching instructor for name: {}", name);

  let instructor = db.find_instructor_by_name(&name).await?;

  Ok(Json(GetInstructorPayload {
    instructor: instructor.clone(),
    reviews: match instructor {
      Some(ins) => {
        let mut reviews = db.find_reviews_by_instructor_name(&ins.name).await?;
        reviews.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        reviews
      }
      None => vec![],
    },
  }))
}
