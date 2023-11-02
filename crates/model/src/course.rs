use super::*;
use derivative::Derivative;

#[derive(Clone, Debug, Default, Deserialize, Derivative, Serialize)]
#[derivative(Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(rename_all = "camelCase")]
pub struct Course {
  #[serde(rename = "_id")]
  pub id: String,
  pub id_ngrams: Option<String>,
  pub title: String,
  pub title_ngrams: Option<String>,
  pub credits: String,
  pub subject: String,
  pub code: String,
  pub level: String,
  pub url: String,
  pub department: String,
  pub faculty: String,
  pub faculty_url: String,
  pub terms: Vec<String>,
  pub description: String,
  pub instructors: Vec<Instructor>,
  pub prerequisites_text: Option<String>,
  pub corequisites_text: Option<String>,
  pub prerequisites: Vec<String>,
  pub corequisites: Vec<String>,
  pub leading_to: Vec<String>,
  pub logical_prerequisites: Option<ReqNode>,
  pub logical_corequisites: Option<ReqNode>,
  pub restrictions: Option<String>,
  pub schedule: Option<Vec<Schedule>>,
  #[derivative(PartialEq = "ignore")]
  #[derivative(Ord = "ignore")]
  #[derivative(Hash = "ignore")]
  #[serde(default = "zero_f32")]
  pub avg_rating: f32,
  #[derivative(PartialEq = "ignore")]
  #[derivative(Ord = "ignore")]
  #[derivative(Hash = "ignore")]
  #[serde(default = "zero_f32")]
  pub avg_difficulty: f32,
  #[derivative(PartialEq = "ignore")]
  #[derivative(Ord = "ignore")]
  #[derivative(Hash = "ignore")]
  #[serde(default = "zero")]
  pub review_count: i32,
}

impl Course {
  pub fn merge(self, other: Course) -> Course {
    Course {
      logical_prerequisites: other
        .logical_prerequisites
        .or(self.logical_prerequisites),
      logical_corequisites: other
        .logical_corequisites
        .or(self.logical_corequisites),
      schedule: other.schedule.or(self.schedule),
      ..other
    }
  }
}

const fn zero() -> i32 {
  0
}

const fn zero_f32() -> f32 {
  0.0
}
