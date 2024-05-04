use super::*;

#[typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, Hash, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum InteractionKind {
  Like,
  Dislike,
}

impl Display for InteractionKind {
  fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
    match self {
      InteractionKind::Like => write!(f, "like"),
      InteractionKind::Dislike => write!(f, "dislike"),
    }
  }
}

impl Into<Bson> for InteractionKind {
  fn into(self) -> bson::Bson {
    Bson::String(self.to_string())
  }
}

#[typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, Hash, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Interaction {
  pub kind: InteractionKind,
  pub user_id: String,
  pub course_id: String,
  pub referrer: String,
}
