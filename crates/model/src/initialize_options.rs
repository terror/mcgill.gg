use super::*;

#[derive(Debug, Default)]
pub struct InitializeOptions {
  pub latest_courses: bool,
  pub multithreaded: bool,
  pub skip_courses: bool,
  pub skip_reviews: bool,
  pub source: PathBuf,
  pub invalidate_schedules: bool,
}
