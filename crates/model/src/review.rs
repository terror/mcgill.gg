use super::*;

#[typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, Hash, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Review {
  pub content: String,
  pub course_id: String,
  pub instructors: Vec<String>,
  pub rating: u32,
  pub difficulty: u32,
  pub timestamp: DateTime,
  pub user_id: String,
  pub likes: i32,
}

impl Default for Review {
  fn default() -> Self {
    Self {
      content: String::new(),
      course_id: String::new(),
      instructors: vec![],
      rating: 0,
      difficulty: 0,
      timestamp: DateTime::from_millis(0),
      user_id: String::new(),
      likes: 0,
    }
  }
}

impl Into<Bson> for Review {
  fn into(self) -> Bson {
    Bson::Document(doc! {
      "content": self.content,
      "courseId": self.course_id,
      "difficulty": self.difficulty,
      "instructors": self.instructors,
      "rating": self.rating,
      "timestamp": self.timestamp,
      "userId": self.user_id,
      "likes": self.likes
    })
  }
}
