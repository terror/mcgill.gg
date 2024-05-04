use super::*;

#[typeshare]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
  pub review: Review,
  pub seen: bool,
  pub user_id: String,
}
