use super::*;

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct User {
  id: String,
  mail: String,
}

#[derive(Serialize, Deserialize)]
struct UserResponse {
  user: Option<User>,
}

pub(crate) async fn get_user(user: Option<User>) -> impl IntoResponse {
  Json(UserResponse { user })
}

#[async_trait]
impl<S> FromRequestParts<S> for User
where
  MemoryStore: FromRef<S>,
  S: Send + Sync,
{
  type Rejection = AuthRedirect;

  async fn from_request_parts(
    parts: &mut Parts,
    state: &S,
  ) -> Result<Self, Self::Rejection> {
    let session_store = MemoryStore::from_ref(state);

    let cookies =
      parts.extract::<TypedHeader<Cookie>>().await.map_err(|e| {
        match *e.name() {
          header::COOKIE => match e.reason() {
            TypedHeaderRejectionReason::Missing => AuthRedirect,
            _ => {
              log::error!("Unexpected error getting cookie header(s): {}", e);
              AuthRedirect
            }
          },
          _ => {
            log::error!("Unexpected error getting cookies: {}", e);
            AuthRedirect
          }
        }
      })?;

    Ok(
      session_store
        .load_session(
          cookies
            .get(auth::COOKIE_NAME)
            .ok_or(AuthRedirect)?
            .to_owned(),
        )
        .await
        .unwrap()
        .ok_or(AuthRedirect)?
        .get::<User>("user")
        .ok_or(AuthRedirect)?,
    )
  }
}
