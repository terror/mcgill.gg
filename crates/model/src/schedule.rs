use super::*;

#[typeshare]
#[derive(
  Clone,
  Debug,
  Default,
  Deserialize,
  Eq,
  Hash,
  Ord,
  PartialEq,
  PartialOrd,
  Serialize,
)]
pub struct Block {
  pub campus: Option<String>,
  pub display: Option<String>,
  pub location: Option<String>,
  pub timeblocks: Option<Vec<TimeBlock>>,
}

impl Into<Bson> for Block {
  fn into(self) -> bson::Bson {
    Bson::Document(doc! {
      "campus": self.campus.map(String::from),
      "display": self.display.map(String::from),
      "location": self.location.map(String::from),
      "timeblocks": self.timeblocks.map(Vec::from),
    })
  }
}

#[typeshare]
#[derive(
  Clone,
  Debug,
  Default,
  Deserialize,
  Eq,
  Hash,
  Ord,
  PartialEq,
  PartialOrd,
  Serialize,
)]
pub struct TimeBlock {
  pub day: Option<String>,
  pub t1: Option<String>,
  pub t2: Option<String>,
}

impl Into<Bson> for TimeBlock {
  fn into(self) -> bson::Bson {
    Bson::Document(doc! {
      "day": self.day.map(String::from),
      "t1": self.t1.map(String::from),
      "t2": self.t2.map(String::from),
    })
  }
}

#[typeshare]
#[derive(
  Clone,
  Debug,
  Default,
  Deserialize,
  Eq,
  Hash,
  Ord,
  PartialEq,
  PartialOrd,
  Serialize,
)]
pub struct Schedule {
  pub blocks: Option<Vec<Block>>,
  pub term: Option<String>,
}

impl Into<Bson> for Schedule {
  fn into(self) -> bson::Bson {
    Bson::Document(doc! {
      "blocks": self.blocks.map(Vec::from),
      "term": self.term.map(String::from),
    })
  }
}
