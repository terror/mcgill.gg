use super::*;

#[derive(Debug, Clone)]
pub(crate) struct Db {
  database: Database,
}

impl Db {
  pub(crate) async fn connect(db_name: &str) -> Result<Self> {
    let mut client_options =
      ClientOptions::parse(format!("mongodb://localhost:27017/{}", db_name))
        .await?;

    client_options.app_name = Some(db_name.to_string());

    let client = Client::with_options(client_options)?;

    client
      .database(db_name)
      .run_command(doc! {"ping": 1}, None)
      .await?;

    log::info!("Connected successfully.");

    Ok(Self {
      database: client.database(db_name),
    })
  }

  pub(crate) async fn seed(&self, source: PathBuf) -> Result {
    log::info!("Seeding courses...");

    for course in
      serde_json::from_str::<Vec<Course>>(&fs::read_to_string(&source)?)?
    {
      match self.find_course(doc! { "title": &course.title }).await? {
        Some(found) => {
          self
            .update_course(
              doc! { "title": &course.title },
              doc! {
                "$set": {
                  "corequisites": course.corequisites,
                  "credits": course.credits,
                  "description": course.description,
                  "faculty_url": course.faculty_url,
                  "instructors": course.instructors.combine(found.instructors),
                  "prerequisites": found.prerequisites,
                  "schedule": course.schedule.combine(found.schedule),
                  "terms": course.terms.combine(found.terms),
                  "url": course.url
                }
              },
            )
            .await?;
        }
        None => {
          self.add_course(course).await?;
        }
      }
    }

    Ok(())
  }

  #[cfg(test)]
  pub(crate) async fn courses(&self) -> Result<Vec<Course>> {
    Ok(
      self
        .database
        .collection::<Course>("courses")
        .find(None, None)
        .await?
        .try_collect::<Vec<Course>>()
        .await?,
    )
  }

  pub(crate) async fn find_course(
    &self,
    query: Document,
  ) -> Result<Option<Course>> {
    Ok(
      self
        .database
        .collection::<Course>("courses")
        .find_one(query, None)
        .await?,
    )
  }

  pub(crate) async fn add_course(
    &self,
    course: Course,
  ) -> Result<InsertOneResult> {
    Ok(
      self
        .database
        .collection::<Course>("courses")
        .insert_one(course, None)
        .await?,
    )
  }

  pub(crate) async fn update_course(
    &self,
    query: Document,
    update: Document,
  ) -> Result<UpdateResult> {
    Ok(
      self
        .database
        .collection::<Course>("courses")
        .update_one(query, UpdateModifications::Document(update), None)
        .await?,
    )
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  struct TestContext {
    db: Db,
    db_name: String,
  }

  impl TestContext {
    async fn new() -> Self {
      static TEST_DATABASE_NUMBER: AtomicUsize = AtomicUsize::new(0);

      let test_database_number =
        TEST_DATABASE_NUMBER.fetch_add(1, Ordering::Relaxed);

      let db_name = format!(
        "mcgill-gg-test-{}-{}",
        std::time::SystemTime::now()
          .duration_since(std::time::SystemTime::UNIX_EPOCH)
          .unwrap()
          .as_millis(),
        test_database_number,
      );

      let db = Db::connect(&db_name).await.unwrap();

      TestContext { db, db_name }
    }
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn on_disk_database_is_persistant() {
    let TestContext { db, db_name } = TestContext::new().await;

    assert_eq!(db.courses().await.unwrap().len(), 0);

    db.add_course(Course::default()).await.unwrap();

    assert_eq!(db.courses().await.unwrap().len(), 1);

    drop(db);

    let db = Db::connect(&db_name).await.unwrap();

    assert_eq!(db.courses().await.unwrap().len(), 1);
  }
}
