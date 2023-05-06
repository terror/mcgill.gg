use model::Instructor;

use super::*;

#[derive(Debug, Clone)]
pub struct Db {
  database: Database,
}

impl Db {
  const COURSE_COLLECTION: &str = "courses";
  const INSTRUCTOR_COLLECTION: &str = "instructors";
  const REVIEW_COLLECTION: &str = "reviews";

  pub async fn connect(db_name: &str) -> Result<Self> {
    let mut client_options =
      ClientOptions::parse(format!("mongodb://localhost:27017/{}", db_name))
        .await?;

    client_options.app_name = Some(db_name.to_string());

    let client = Client::with_options(client_options)?;

    client
      .database(db_name)
      .run_command(doc! {"ping": 1}, None)
      .await?;

    info!("Connected to MongoDB.");

    Ok(Self {
      database: client.database(db_name),
    })
  }

  pub fn name(&self) -> String {
    self.database.name().to_string()
  }

  pub async fn seed(&self, source: PathBuf) -> Result {
    info!("Seeding courses...");

    let mut courses = Vec::new();

    if source.is_file() {
      courses.push(serde_json::from_str::<Vec<Course>>(&fs::read_to_string(
        source,
      )?)?);
    } else {
      let mut paths = fs::read_dir(source)?
        .map(|path| path.unwrap().path())
        .collect::<Vec<_>>();

      paths.sort();

      for path in paths {
        courses.push(serde_json::from_str::<Vec<Course>>(
          &fs::read_to_string(path)?,
        )?);
      }
    }

    for batch in courses.clone() {
      for course in batch {
        match self.find_course(doc! { "_id": &course.id, }).await? {
          Some(found) => {
            self
            .update_course(
              doc! { "_id": &course.id },
              doc! {
                "$set": {
                  "corequisites": course.corequisites,
                  "credits": course.credits,
                  "description": course.description,
                  "facultyUrl": course.faculty_url,
                  "instructors": course.instructors.combine(found.instructors),
                  "level": course.level,
                  "prerequisites": course.prerequisites,
                  "restrictions": course.restrictions,
                  "schedule": course.schedule.unwrap_or(Vec::new()).combine(found.schedule.unwrap_or(Vec::new())),
                  "terms": course.terms.combine(found.terms),
                  "title": course.title,
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
    }

    for instructor in courses
      .iter()
      .flatten()
      .map(|course| course.instructors.clone())
      .flatten()
      .collect::<Vec<Instructor>>()
    {
      match self
        .find_instructor(doc! { "name": &instructor.name })
        .await?
      {
        Some(found) => {
          self
            .update_instructor(
              doc! { "name": &instructor.name },
              doc! {
                "$set": {
                  "name": found.name,
                  "term": found.term
                }
              },
            )
            .await?;
        }
        None => {
          self.add_instructor(instructor).await?;
        }
      }
    }

    info!("Finished seeding courses and instructors, building indices...");

    self
      .create_course_index(
        doc! {
          "subject": "text",
          "code": "text",
          "_id": "text",
          "title": "text",
          "idNgrams": "text",
          "titleNgrams": "text",
        },
        doc! {
          "subject": 10,
          "code": 10,
          "_id": 10,
          "title": 8,
          "idNgrams": 4,
          "titleNgrams": 2,
        },
      )
      .await?;

    info!("Course index complete.");

    Ok(())
  }

  pub async fn courses(
    &self,
    limit: Option<i64>,
    offset: Option<u64>,
    course_subjects: Option<Vec<String>>,
    course_levels: Option<Vec<String>>,
    course_terms: Option<Vec<String>>,
  ) -> Result<Vec<Course>> {
    let mut document = Document::new();

    if let Some(ref course_subjects) = course_subjects {
      document.insert(
        "subject",
        doc! { "$regex": format!("^({})", course_subjects.join("|")) },
      );
    }

    if let Some(ref course_levels) = course_levels {
      document.insert(
        "code",
        doc! { "$regex": format!("^({})", course_levels.join("|")) },
      );
    }

    if let Some(ref course_terms) = course_terms {
      document.insert(
        "terms",
        doc! { "$regex": format!("^({})", course_terms.join("|")) },
      );
    }

    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .find(
          if document.is_empty() {
            None
          } else {
            Some(document)
          },
          FindOptions::builder().skip(offset).limit(limit).build(),
        )
        .await?
        .try_collect::<Vec<Course>>()
        .await?,
    )
  }

  pub async fn search(&self, query: &str) -> Result<Vec<Course>> {
    info!("Received query: {query}");

    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .find(
          doc! { "$text" : { "$search": query } },
          FindOptions::builder()
            .sort(doc! { "score": { "$meta" : "textScore" }})
            .limit(10)
            .build(),
        )
        .await?
        .try_collect::<Vec<Course>>()
        .await?,
    )
  }

  pub async fn find_course_by_id(&self, id: &str) -> Result<Option<Course>> {
    self.find_course(doc! { "_id": id }).await
  }

  pub async fn add_review(&self, review: Review) -> Result<InsertOneResult> {
    if self
      .find_review(&review.course_id, &review.user_id)
      .await?
      .is_some()
    {
      Err(anyhow!("Cannot review this course twice"))
    } else {
      Ok(
        self
          .database
          .collection::<Review>(Db::REVIEW_COLLECTION)
          .insert_one(review, None)
          .await?,
      )
    }
  }

  pub async fn update_review(&self, review: Review) -> Result<UpdateResult> {
    Ok(
      self
        .database
        .collection::<Review>(Db::REVIEW_COLLECTION)
        .update_one(
          doc! {
            "courseId": review.course_id,
            "userId": review.user_id
          },
          UpdateModifications::Document(doc! {
            "$set": {
              "content": &review.content,
              "instructor": &review.instructor,
              "rating": review.rating,
              "timestamp": review.timestamp
            },
          }),
          None,
        )
        .await?,
    )
  }

  pub async fn delete_review(
    &self,
    course_id: &str,
    user_id: &str,
  ) -> Result<DeleteResult> {
    Ok(
      self
        .database
        .collection::<Review>(Db::REVIEW_COLLECTION)
        .delete_one(
          doc! {
            "courseId": course_id,
            "userId": user_id
          },
          None,
        )
        .await?,
    )
  }

  pub async fn find_reviews_by_course_id(
    &self,
    course_id: &str,
  ) -> Result<Vec<Review>> {
    self.find_reviews(doc! { "courseId": course_id }).await
  }

  pub async fn find_reviews_by_user_id(
    &self,
    user_id: &str,
  ) -> Result<Vec<Review>> {
    self.find_reviews(doc! { "userId": user_id }).await
  }

  pub async fn find_review(
    &self,
    course_id: &str,
    user_id: &str,
  ) -> Result<Option<Review>> {
    Ok(
      self
        .database
        .collection::<Review>(Db::REVIEW_COLLECTION)
        .find_one(doc! { "courseId": course_id, "userId": user_id }, None)
        .await?,
    )
  }

  async fn find_reviews(&self, query: Document) -> Result<Vec<Review>> {
    Ok(
      self
        .database
        .collection::<Review>(Db::REVIEW_COLLECTION)
        .find(query, None)
        .await?
        .try_collect::<Vec<Review>>()
        .await?,
    )
  }

  async fn find_course(&self, query: Document) -> Result<Option<Course>> {
    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .find_one(query, None)
        .await?,
    )
  }

  async fn add_course(&self, course: Course) -> Result<InsertOneResult> {
    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .insert_one(
          Course {
            id_ngrams: Some(course.id.ngrams()),
            title_ngrams: Some(course.title.filter_stopwords().ngrams()),
            ..course
          },
          None,
        )
        .await?,
    )
  }

  async fn update_course(
    &self,
    query: Document,
    update: Document,
  ) -> Result<UpdateResult> {
    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .update_one(query, UpdateModifications::Document(update), None)
        .await?,
    )
  }

  async fn create_course_index(
    &self,
    keys: Document,
    weights: Document,
  ) -> Result<CreateIndexResult> {
    Ok(
      self
        .database
        .collection::<Course>(Db::COURSE_COLLECTION)
        .create_index(
          IndexModel::builder()
            .keys(keys)
            .options(IndexOptions::builder().weights(weights).build())
            .build(),
          None,
        )
        .await?,
    )
  }

  async fn add_instructor(
    &self,
    instructor: Instructor,
  ) -> Result<InsertOneResult> {
    Ok(
      self
        .database
        .collection::<Instructor>(Db::INSTRUCTOR_COLLECTION)
        .insert_one(instructor, None)
        .await?,
    )
  }

  async fn update_instructor(
    &self,
    filter: Document,
    update: Document,
  ) -> Result<UpdateResult> {
    Ok(
      self
        .database
        .collection::<Instructor>(Db::INSTRUCTOR_COLLECTION)
        .update_one(filter, update, None)
        .await?,
    )
  }

  async fn find_instructor(
    &self,
    filter: Document,
  ) -> Result<Option<Instructor>> {
    Ok(
      self
        .database
        .collection::<Instructor>(Db::INSTRUCTOR_COLLECTION)
        .find_one(filter, None)
        .await?,
    )
  }

  #[cfg(test)]
  async fn reviews(&self) -> Result<Vec<Review>> {
    Ok(
      self
        .database
        .collection::<Review>(Db::REVIEW_COLLECTION)
        .find(None, None)
        .await?
        .try_collect::<Vec<Review>>()
        .await?,
    )
  }
}

#[cfg(test)]
mod tests {
  use {super::*, pretty_assertions::assert_eq};

  static SEED_DIR: Dir<'_> = include_dir!("crates/db/seeds");

  fn get_content(name: &str) -> String {
    SEED_DIR
      .get_file(name)
      .unwrap()
      .contents_utf8()
      .unwrap()
      .to_string()
  }

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
  async fn on_disk_database_is_persistent() {
    let TestContext { db, db_name } = TestContext::new().await;

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      0
    );

    db.add_course(Course::default()).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      1
    );

    drop(db);

    let db = Db::connect(&db_name).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      1
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn course_seeding_is_accurate() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("before_update.json")).unwrap();

    db.seed(source).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      2
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn course_seeding_does_not_insert_duplicates() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(
      &source,
      serde_json::to_string(
        &(0..10).map(|_| Course::default()).collect::<Vec<Course>>(),
      )
      .unwrap(),
    )
    .unwrap();

    db.seed(source).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      1
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn courses_get_updated_when_seeding() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("before_update.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      2
    );

    fs::write(&source, get_content("update.json")).unwrap();

    db.seed(source).await.unwrap();

    let courses = db.courses(None, None, None, None, None).await.unwrap();

    assert_eq!(courses.len(), 3);

    assert_eq!(
      courses,
      serde_json::from_str::<Vec<Course>>(&get_content("after_update.json"))
        .unwrap()
        .into_iter()
        .map(|c| Course {
          id_ngrams: Some(c.id.ngrams()),
          title_ngrams: Some(c.title.filter_stopwords().ngrams()),
          ..c
        })
        .collect::<Vec<Course>>()
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn search_is_accurate() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      123
    );

    let courses = db.search("COMP 202").await.unwrap();

    assert_eq!(courses.len(), 10);

    let first = courses.first().unwrap();

    assert_eq!(first.subject, "COMP");
    assert_eq!(first.code, "202");
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn get_course_by_id() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    let courses = db.courses(None, None, None, None, None).await.unwrap();

    assert_eq!(courses.len(), 123);

    let first = courses.first().unwrap();

    assert_eq!(
      db.find_course_by_id(&first.id).await.unwrap().unwrap(),
      *first
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn search_course_by_id_exact() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      123
    );

    let courses = db.search("COMP202").await.unwrap();

    assert_eq!(courses.len(), 1);

    let first = courses.first().unwrap();

    assert_eq!(first.subject, "COMP");
    assert_eq!(first.code, "202");
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn fuzzy_search_course_by_title() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(None, None, None, None, None)
        .await
        .unwrap()
        .len(),
      123
    );

    let courses = db.search("foundations of").await.unwrap();

    assert_eq!(courses.len(), 1);

    let first = courses.first().unwrap();

    assert_eq!(first.subject, "COMP");
    assert_eq!(first.code, "202");
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn get_courses_with_limit() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(Some(10), None, None, None, None)
        .await
        .unwrap()
        .len(),
      10
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn get_courses_with_offset() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("search.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    assert_eq!(
      db.courses(None, Some(20), None, None, None)
        .await
        .unwrap()
        .len(),
      103
    );
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn add_reviews() {
    let TestContext { db, .. } = TestContext::new().await;

    let reviews = vec![
      Review {
        content: "foo".into(),
        course_id: "MATH240".into(),
        instructor: "test".into(),
        rating: 5,
        user_id: "1".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        course_id: "MATH240".into(),
        instructor: "test".into(),
        rating: 5,
        user_id: "2".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        course_id: "MATH240".into(),
        instructor: "test".into(),
        rating: 5,
        user_id: "3".into(),
        ..Default::default()
      },
    ];

    for review in &reviews {
      db.add_review(review.clone()).await.unwrap();
    }

    assert_eq!(db.reviews().await.unwrap().len(), 3);
    assert_eq!(db.reviews().await.unwrap(), reviews);
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn find_reviews_by_course_id() {
    let TestContext { db, .. } = TestContext::new().await;

    let reviews = vec![
      Review {
        content: "foo".into(),
        user_id: "1".into(),
        instructor: "test".into(),
        rating: 5,
        course_id: "MATH240".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        user_id: "2".into(),
        instructor: "test".into(),
        rating: 5,
        course_id: "MATH240".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        user_id: "3".into(),
        instructor: "test".into(),
        rating: 5,
        course_id: "MATH340".into(),
        ..Default::default()
      },
    ];

    for review in &reviews {
      db.add_review(review.clone()).await.unwrap();
    }

    assert_eq!(db.reviews().await.unwrap().len(), 3);
    assert_eq!(db.reviews().await.unwrap(), reviews);

    assert_eq!(
      db.find_reviews_by_course_id("MATH240").await.unwrap(),
      vec![
        Review {
          content: "foo".into(),
          user_id: "1".into(),
          instructor: "test".into(),
          rating: 5,
          course_id: "MATH240".into(),
          ..Default::default()
        },
        Review {
          content: "foo".into(),
          course_id: "MATH240".into(),
          instructor: "test".into(),
          rating: 5,
          user_id: "2".into(),
          ..Default::default()
        }
      ]
    )
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn find_reviews_by_user_id() {
    let TestContext { db, .. } = TestContext::new().await;

    let reviews = vec![
      Review {
        content: "foo".into(),
        user_id: "1".into(),
        course_id: "MATH240".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        user_id: "2".into(),
        course_id: "MATH240".into(),
        ..Default::default()
      },
      Review {
        content: "foo".into(),
        user_id: "3".into(),
        course_id: "MATH340".into(),
        ..Default::default()
      },
    ];

    for review in &reviews {
      db.add_review(review.clone()).await.unwrap();
    }

    assert_eq!(db.reviews().await.unwrap().len(), 3);
    assert_eq!(db.reviews().await.unwrap(), reviews);

    assert_eq!(
      db.find_reviews_by_user_id("2").await.unwrap(),
      vec![Review {
        content: "foo".into(),
        user_id: "2".into(),
        instructor: "".into(),
        rating: 0,
        course_id: "MATH240".into(),
        ..Default::default()
      },]
    )
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn dont_add_multiple_reviews_per_user() {
    let TestContext { db, .. } = TestContext::new().await;

    let review = Review {
      user_id: "1".into(),
      course_id: "MATH240".into(),
      ..Default::default()
    };

    db.add_review(review.clone()).await.unwrap();

    assert!(db.add_review(review).await.is_err());
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn update_review() {
    let TestContext { db, .. } = TestContext::new().await;

    db.add_review(Review {
      content: "foo".into(),
      course_id: "MATH240".into(),
      instructor: "bar".into(),
      rating: 5,
      user_id: "1".into(),
      timestamp: DateTime::from_chrono::<Utc>(Utc::now()),
    })
    .await
    .unwrap();

    let timestamp = DateTime::from_chrono::<Utc>(Utc::now());

    assert_eq!(
      db.update_review(Review {
        content: "bar".into(),
        course_id: "MATH240".into(),
        instructor: "foo".into(),
        rating: 4,
        user_id: "1".into(),
        timestamp
      })
      .await
      .unwrap()
      .modified_count,
      1
    );

    assert_eq!(
      db.update_review(Review {
        content: "bar".into(),
        course_id: "MATH240".into(),
        instructor: "foo".into(),
        rating: 4,
        user_id: "2".into(),
        ..Default::default()
      })
      .await
      .unwrap()
      .modified_count,
      0
    );

    let review = db.find_review("MATH240", "1").await.unwrap().unwrap();

    assert_eq!(review.content, "bar");
    assert_eq!(review.instructor, "foo");
    assert_eq!(review.rating, 4);
    assert_eq!(review.timestamp, timestamp);
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn delete_review() {
    let TestContext { db, .. } = TestContext::new().await;

    db.add_review(Review {
      content: "foo".into(),
      course_id: "MATH240".into(),
      user_id: "1".into(),
      ..Default::default()
    })
    .await
    .unwrap();

    assert_eq!(
      db.delete_review("MATH240", "2")
        .await
        .unwrap()
        .deleted_count,
      0
    );

    assert_eq!(
      db.delete_review("MATH240", "1")
        .await
        .unwrap()
        .deleted_count,
      1
    );

    assert_eq!(db.find_review("MATH240", "1").await.unwrap(), None);
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn delete_review_then_add_again() {
    let TestContext { db, .. } = TestContext::new().await;

    db.add_review(Review {
      content: "foo".into(),
      course_id: "MATH240".into(),
      user_id: "1".into(),
      ..Default::default()
    })
    .await
    .unwrap();

    assert_eq!(
      db.delete_review("MATH240", "1")
        .await
        .unwrap()
        .deleted_count,
      1
    );

    assert!(db
      .add_review(Review {
        content: "foo".into(),
        course_id: "MATH240".into(),
        user_id: "1".into(),
        ..Default::default()
      })
      .await
      .is_ok());
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn filter_courses_by_subject() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("mix.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    let total = db.courses(None, None, None, None, None).await.unwrap();

    assert_eq!(total.len(), 314);

    let filtered = db
      .courses(None, None, Some(vec!["MATH".into()]), None, None)
      .await
      .unwrap();

    assert!(filtered.len() < total.len());

    for course in filtered {
      assert_eq!(course.subject, "MATH");
    }
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn filter_courses_by_level() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("mix.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    let total = db.courses(None, None, None, None, None).await.unwrap();

    assert_eq!(total.len(), 314);

    let filtered = db
      .courses(None, None, None, Some(vec!["100".into()]), None)
      .await
      .unwrap();

    assert!(filtered.len() < total.len());

    for course in filtered {
      assert!(course.code.starts_with('1'));
    }
  }

  #[tokio::test(flavor = "multi_thread")]
  async fn filter_courses_by_term() {
    let TestContext { db, db_name } = TestContext::new().await;

    let tempdir = TempDir::new(&db_name).unwrap();

    let source = tempdir.path().join("courses.json");

    fs::write(&source, get_content("mix.json")).unwrap();

    db.seed(source.clone()).await.unwrap();

    let total = db.courses(None, None, None, None, None).await.unwrap();

    assert_eq!(total.len(), 314);

    let filtered = db
      .courses(None, None, None, None, Some(vec!["Winter".into()]))
      .await
      .unwrap();

    assert!(filtered.len() < total.len());

    for course in filtered {
      assert!(course
        .terms
        .iter()
        .any(|term| term.starts_with(&"Winter".to_string())));
    }
  }
}
