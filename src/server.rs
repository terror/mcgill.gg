use super::*;

#[derive(Parser)]
pub(crate) struct Server {
  #[clap(long, help = "Directory to serve assets from")]
  asset_dir: Option<PathBuf>,
  #[clap(long, default_value = "8000", help = "Port to listen on")]
  port: u16,
  #[clap(long, default_value = "admin", help = "Database name")]
  db_name: String,
  #[clap(long, default_value = "false", help = "Seed latest courses only")]
  latest_courses: bool,
  #[clap(long, default_value = "false", help = "Enable multithreaded seeding")]
  multithreaded: bool,
  #[clap(long, default_value = "false", help = "Initialize the database")]
  initialize: bool,
  #[clap(long, default_value = "false", help = "Skip course seeding")]
  skip_courses: bool,
  #[clap(long, default_value = "false", help = "Skip review seeding")]
  skip_reviews: bool,
}

#[derive(Debug)]
struct AppConfig<'a> {
  db: Arc<Db>,
  assets: Option<Assets<'a>>,
  session_store: MongodbSessionStore,
  rate_limit: bool,
}

impl Server {
  pub(crate) async fn run(self, source: PathBuf) -> Result {
    let addr = SocketAddr::from(([0, 0, 0, 0], self.port));

    info!("Listening on port: {}", addr.port());

    let db = Arc::new(Db::connect(&self.db_name).await?);

    if self.initialize {
      let source_hash = source.hash()?;

      let client = match env::var("ENV") {
        Ok(env) if env == "production" => Some(S3Client::new(Region::UsEast1)),
        _ => None,
      };

      let prev_hash = match client {
        Some(ref client) => client.get("mcgill.courses", "source-hash").await?,
        None => None,
      };

      if Some(&source_hash) != prev_hash.as_ref() {
        let clone = db.clone();

        if let Some(client) = client {
          client
            .put("mcgill.courses", "source-hash", source_hash)
            .await?;
        }

        tokio::spawn(async move {
          if let Err(error) = clone
            .initialize(InitializeOptions {
              latest_courses: self.latest_courses,
              multithreaded: self.multithreaded,
              skip_courses: self.skip_courses,
              skip_reviews: self.skip_reviews,
              source,
            })
            .await
          {
            error!("error: {error}");
          }
        });
      }
    }

    let assets = self.asset_dir.as_ref().map(|asset_dir| Assets {
      dir: ServeDir::new(asset_dir.clone()),
      index: ServeFile::new(asset_dir.join("index.html")),
      route: "/assets",
    });

    let session_store = MongodbSessionStore::new(
      &env::var("MONGODB_URL").unwrap_or_else(|_| {
        "mongodb://localhost:27017/?directConnection=true&replicaSet=rs0".into()
      }),
      &db.name(),
      "store",
    )
    .await?;

    axum_server::Server::bind(addr)
      .serve(
        Self::app(AppConfig {
          db,
          assets,
          session_store,
          rate_limit: true,
        })
        .await?
        .into_make_service_with_connect_info::<SocketAddr>(),
      )
      .await?;

    Ok(())
  }

  async fn app(config: AppConfig<'_>) -> Result<Router> {
    let mut router = Router::new()
      .route("/api/auth/authorized", get(auth::login_authorized))
      .route("/api/auth/login", get(auth::microsoft_auth))
      .route("/api/auth/logout", get(auth::logout))
      .route("/api/courses", post(courses::get_courses))
      .route("/api/courses/:id", get(courses::get_course_by_id))
      .route("/api/instructors/:name", get(instructors::get_instructor))
      .route(
        "/api/interactions/:course_id/referrer/:referrer",
        get(interactions::get_user_interactions_for_course),
      )
      .route(
        "/api/interactions",
        get(interactions::get_interaction_kind)
          .post(interactions::add_interaction)
          .delete(interactions::delete_interaction),
      )
      .route(
        "/api/notifications",
        get(notifications::get_notifications)
          .put(notifications::update_notification)
          .delete(notifications::delete_notification),
      )
      .route(
        "/api/reviews",
        get(reviews::get_reviews)
          .delete(reviews::delete_review)
          .post(reviews::add_review)
          .put(reviews::update_review),
      )
      .route("/api/reviews/:id", get(reviews::get_review))
      .route("/api/search", get(search::search))
      .route(
        "/api/subscriptions",
        get(subscriptions::get_subscription)
          .post(subscriptions::add_subscription)
          .delete(subscriptions::delete_subscription),
      )
      .route("/api/user", get(user::get_user));

    // Serve microsoft identity association file
    router = router.route(
      "/.well-known/microsoft-identity-association.json",
      get(|| async {
        info!("Serving microsoft-identity-association.json");

        fs::read_to_string(PathBuf::from(
          ".well-known/microsoft-identity-association.json",
        ))
        .unwrap_or_else(|_| "Error reading file".to_string())
      }),
    );

    if let Some(assets) = config.assets {
      info!("Adding asset directory to router...");

      router = router
        .nest_service(assets.route, assets.dir)
        .fallback_service(assets.index)
    }

    let router = router
      .with_state(State::new(config.db, config.session_store).await?)
      .layer(
        TraceLayer::new_for_http()
          .on_request(|request: &Request<Body>, _span: &Span| {
            info!("Received {} {}", request.method(), request.uri().path(),)
          })
          .on_response(
            |response: &Response, latency: Duration, _span: &Span| {
              info!("Response {} in {:?}", response.status(), latency)
            },
          ),
      );

    Ok(if config.rate_limit {
      router.layer(
        ServiceBuilder::new()
          .layer(HandleErrorLayer::new(|err: BoxError| async move {
            display_error(err)
          }))
          .layer(GovernorLayer {
            config: Box::leak(Box::new(
              GovernorConfigBuilder::default()
                .per_millisecond(10)
                .burst_size(100)
                .finish()
                .ok_or(anyhow!("Failed to create governor configuration"))?,
            )),
          })
          .layer(CorsLayer::very_permissive()),
      )
    } else {
      router.layer(CorsLayer::very_permissive())
    })
  }
}

#[cfg(test)]
mod tests {
  use {
    super::*,
    crate::instructors::GetInstructorPayload,
    axum::body::Body,
    courses::{GetCoursePayload, GetCoursesPayload},
    http::{Method, Request},
    interactions::{
      GetCourseReviewsInteractionPayload, GetInteractionKindPayload,
    },
    model::Notification,
    pretty_assertions::assert_eq,
    reviews::GetReviewsPayload,
    serde::de::DeserializeOwned,
    serde_json::json,
    std::sync::atomic::{AtomicUsize, Ordering},
    tower::{Service, ServiceExt},
  };

  struct TestContext {
    app: Router,
    db: Arc<Db>,
    session_store: MongodbSessionStore,
  }

  impl TestContext {
    async fn new() -> Self {
      dotenv().ok();

      static TEST_DATABASE_NUMBER: AtomicUsize = AtomicUsize::new(0);

      let test_database_number =
        TEST_DATABASE_NUMBER.fetch_add(1, Ordering::Relaxed);

      let db_name = format!(
        "mcgill-courses-test-{}-{}",
        std::time::SystemTime::now()
          .duration_since(std::time::SystemTime::UNIX_EPOCH)
          .unwrap()
          .as_millis(),
        test_database_number,
      );

      let db = Arc::new(Db::connect(&db_name).await.unwrap());

      let session_store = MongodbSessionStore::new(
        "mongodb://localhost:27017/?directConnection=true&replicaSet=rs0",
        &db.name(),
        "store",
      )
      .await
      .unwrap();

      let app = Server::app(AppConfig {
        db: db.clone(),
        assets: None,
        session_store: session_store.clone(),
        rate_limit: false,
      })
      .await
      .unwrap();

      TestContext {
        app,
        db,
        session_store,
      }
    }
  }

  fn seed() -> PathBuf {
    PathBuf::from("crates/db/test-seeds/mini.json")
  }

  async fn mock_login(
    session_store: MongodbSessionStore,
    id: &str,
    mail: &str,
  ) -> String {
    let mut session = Session::new();

    session.insert("user", User::new(id, mail)).unwrap();

    format!(
      "{}={}",
      COOKIE_NAME,
      session_store.store_session(session).await.unwrap().unwrap()
    )
  }

  #[async_trait]
  trait ResponseExt {
    async fn convert<T: DeserializeOwned>(self) -> T;
  }

  #[async_trait]
  impl ResponseExt for Response {
    async fn convert<T: DeserializeOwned>(self) -> T {
      serde_json::from_slice::<T>(
        &axum::body::to_bytes(self.into_body(), usize::MAX)
          .await
          .unwrap(),
      )
      .unwrap()
    }
  }

  #[derive(Debug, Deserialize, Serialize)]
  pub(crate) struct GetCourseWithReviewsPayload {
    pub(crate) course: Course,
    pub(crate) reviews: Vec<Review>,
  }

  #[tokio::test]
  async fn courses_route_works() {
    let TestContext { db, app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let body = json!({
      "subjects": None::<Vec<String>>,
      "levels": None::<Vec<String>>,
      "terms": None::<Vec<String>>,
    });

    let response = app
      .oneshot(
        Request::builder()
          .method(Method::POST)
          .uri("/api/courses")
          .header("Content-Type", "application/json")
          .body(Body::from(body.to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response.convert::<GetCoursesPayload>().await;

    assert_eq!(payload.courses, db.courses(None, None, None).await.unwrap());
    assert_eq!(payload.course_count, None);
  }

  #[tokio::test]
  async fn courses_route_offset_limit() {
    let TestContext { db, app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let body = json!({
      "subjects": None::<Vec<String>>,
      "levels": None::<Vec<String>>,
      "terms": None::<Vec<String>>,
    });

    let response = app
      .oneshot(
        Request::builder()
          .method(Method::POST)
          .uri("/api/courses?limit=10&offset=40")
          .header("Content-Type", "application/json")
          .body(Body::from(body.to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response.convert::<GetCoursesPayload>().await;

    assert_eq!(
      payload.courses,
      db.courses(Some(10), Some(40), None).await.unwrap()
    );
  }

  #[tokio::test]
  async fn courses_route_disallows_negative_limit_or_offset() {
    let TestContext { app, .. } = TestContext::new().await;

    let body = json!({
      "subjects": None::<Vec<String>>,
      "levels": None::<Vec<String>>,
      "terms": None::<Vec<String>>,
    });

    let response = app
      .clone()
      .oneshot(
        Request::builder()
          .method(Method::POST)
          .uri("/api/courses?limit=-10&offset=-10")
          .header("Content-Type", "application/json")
          .body(Body::from(body.to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
  }

  #[tokio::test]
  async fn course_by_id_works() {
    let TestContext { db, app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let response = app
      .oneshot(
        Request::builder()
          .uri("/api/courses/COMP202")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response.convert::<GetCoursePayload>().await;

    assert_eq!(
      payload.course,
      db.find_course_by_id("COMP202").await.unwrap().unwrap()
    );
  }

  #[tokio::test]
  async fn can_get_course_with_reviews() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .uri("/api/courses/MATH240?with_reviews=true")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response.convert::<GetCourseWithReviewsPayload>().await;

    assert_eq!(
      payload.course,
      db.find_course_by_id("MATH240").await.unwrap().unwrap()
    );

    assert_eq!(payload.reviews.len(), 1);
  }

  #[tokio::test]
  async fn course_by_id_invalid_course_code() {
    let TestContext { db, app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let response = app
      .oneshot(
        Request::builder()
          .uri("/api/courses/COMP1337")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    assert_eq!(response.convert::<Option<Course>>().await, None);
  }

  #[tokio::test]
  async fn unauthenticated_cant_add_review() {
    let TestContext { db, app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let response = app
      .oneshot(
        Request::builder()
          .method(http::Method::POST)
          .uri("/api/reviews")
          .body(Body::from(
            json!({"content": "test", "course_id": "MATH240"}).to_string(),
          ))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::TEMPORARY_REDIRECT);
  }

  #[tokio::test]
  async fn can_add_review() {
    let TestContext {
      db,
      app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .oneshot(
        Request::builder()
          .method(http::Method::POST)
          .header(
            "Cookie",
            mock_login(session_store, "test", "test@mail.mcgill.ca").await,
          )
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);
  }

  #[tokio::test]
  async fn throws_error_when_invalid_instructor() {
    let TestContext {
      db,
      app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta", "lmao"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .oneshot(
        Request::builder()
          .method(http::Method::POST)
          .header(
            "Cookie",
            mock_login(session_store, "test", "test@mail.mcgill.ca").await,
          )
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
  }

  #[tokio::test]
  async fn can_delete_review() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::DELETE)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(json!({"course_id": "MATH240"}).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 0);
  }

  #[tokio::test]
  async fn can_update_review() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
        "content": "test",
        "course_id": "MATH240",
        "instructors": ["Adrian Roshan Vetta"],
        "rating": 1,
        "difficulty": 5
    })
    .to_string();

    app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    let review = json!({
      "content": "updated",
      "course_id": "MATH240",
      "instructors": ["Jeremy Macdonald"],
      "rating": 5,
      "difficulty": 2
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::PUT)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let review = db.find_review("MATH240", "test").await.unwrap().unwrap();

    assert_eq!(review.content, "updated");
    assert_eq!(review.instructors, vec![String::from("Jeremy Macdonald")]);
    assert_eq!(review.rating, 5);
  }

  #[tokio::test]
  async fn can_get_reviews_by_user_id() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie =
      mock_login(session_store.clone(), "test", "test@mail.mcgill.ca").await;

    let reviews = vec![
      json!({
        "content": "test",
        "course_id": "COMP202",
        "instructors": ["Jonathan Campbell"],
        "rating": 5,
        "difficulty": 5
      }),
      json!({
        "content": "test2",
        "course_id": "MATH240",
        "instructors": ["Adrian Roshan Vetta"],
        "rating": 5,
        "difficulty": 5
      }),
      json!({
        "content": "test3",
        "course_id": "COMP252",
        "instructors": ["Luc P Devroye"],
        "rating": 5,
        "difficulty": 5
      }),
    ];

    for review in reviews {
      app
        .call(
          Request::builder()
            .method(http::Method::POST)
            .header("Cookie", cookie.clone())
            .header("Content-Type", "application/json")
            .uri("/api/reviews")
            .body(Body::from(review.to_string()))
            .unwrap(),
        )
        .await
        .unwrap();
    }

    app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header(
            "Cookie",
            mock_login(session_store, "test2", "test2@mail.mcgill.ca").await,
          )
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(
            json!({"content": "test4", "course_id": "COMP202"}).to_string(),
          ))
          .unwrap(),
      )
      .await
      .unwrap();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .uri("/api/reviews?user_id=test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      response.convert::<GetReviewsPayload>().await.reviews.len(),
      3
    );
  }

  #[tokio::test]
  async fn can_get_reviews_by_course_id() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookies = [
      mock_login(session_store.clone(), "test", "test@mail.mcgill.ca").await,
      mock_login(session_store, "test2", "test2@mail.mcgill.ca").await,
    ];

    let reviews = vec![
      json!({
        "content": "test",
        "course_id": "MATH240",
        "instructors": ["Adrian Roshan Vetta"],
        "rating": 5,
        "difficulty": 5
      }),
      json!({
         "content": "test2",
         "course_id": "MATH240",
         "instructors": ["Adrian Roshan Vetta"],
         "rating": 5,
         "difficulty": 5
      }),
    ];

    for (cookie, review) in cookies.iter().zip(reviews) {
      app
        .call(
          Request::builder()
            .method(http::Method::POST)
            .header("Cookie", cookie.clone())
            .header("Content-Type", "application/json")
            .uri("/api/reviews")
            .body(Body::from(review.to_string()))
            .unwrap(),
        )
        .await
        .unwrap();
    }

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .uri("/api/reviews?course_id=MATH240")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      response.convert::<GetReviewsPayload>().await.reviews.len(),
      2
    )
  }

  #[tokio::test]
  async fn can_interact_with_reviews() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions?course_id=MATH240&user_id=test&referrer=test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(
      response.convert::<GetInteractionKindPayload>().await,
      GetInteractionKindPayload { kind: None }
    );

    let interaction = json! ({
      "kind": "like",
      "course_id": "MATH240",
      "user_id": "test",
      "referrer": "test"
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions")
          .body(Body::from(interaction))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      db.interactions_for_review("MATH240", "test")
        .await
        .unwrap()
        .len(),
      1
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions?course_id=MATH240&user_id=test&referrer=test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      response.convert::<GetInteractionKindPayload>().await,
      GetInteractionKindPayload {
        kind: Some(InteractionKind::Like),
      }
    );

    let interaction = json! ({
      "course_id": "MATH240",
      "user_id": "test",
      "referrer": "test"
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::DELETE)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions")
          .body(Body::from(interaction))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      db.interactions_for_review("MATH240", "test")
        .await
        .unwrap()
        .len(),
      0
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions?course_id=MATH240&user_id=test&referrer=test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      response.convert::<GetInteractionKindPayload>().await,
      GetInteractionKindPayload { kind: None }
    );
  }

  #[tokio::test]
  async fn get_invalid_instructor() {
    let TestContext { db, mut app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Content-Type", "application/json")
          .uri("/api/instructors/foobar")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    let payload = response.convert::<GetInstructorPayload>().await;

    assert_eq!(payload.instructor, None);
    assert_eq!(payload.reviews.len(), 0);
  }

  #[tokio::test]
  async fn can_get_instructors_with_reviews() {
    let TestContext {
      db,
      mut app,
      session_store,
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Content-Type", "application/json")
          .uri("/api/instructors/Adrian%20Roshan%20Vetta")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response.convert::<GetInstructorPayload>().await;

    assert_eq!(
      payload.instructor,
      Some(Instructor {
        name: "Adrian Roshan Vetta".to_string(),
        name_ngrams: Some(
          "Adr Adri Adria Adrian Ros Rosh Rosha Roshan Vet Vett Vetta".into()
        ),
        term: "Fall 2022".into(),
      })
    );

    assert_eq!(payload.reviews.len(), 1)
  }

  #[tokio::test]
  async fn get_empty_user_interactions_for_course() {
    let TestContext { db, mut app, .. } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Content-Type", "application/json")
          .uri("/api/interactions/COMP202/referrer/test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response
      .convert::<GetCourseReviewsInteractionPayload>()
      .await;

    assert_eq!(payload.course_id, "COMP202");
    assert_eq!(payload.interactions.len(), 0);
  }

  #[tokio::test]
  async fn get_user_interactions_for_course() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);

    let interaction = json! ({
      "kind": "like",
      "course_id": "MATH240",
      "user_id": "test",
      "referrer": "test"
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions")
          .body(Body::from(interaction))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      db.interactions_for_review("MATH240", "test")
        .await
        .unwrap()
        .len(),
      1
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Content-Type", "application/json")
          .uri("/api/interactions/MATH240/referrer/test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let payload = response
      .convert::<GetCourseReviewsInteractionPayload>()
      .await;

    assert_eq!(payload.course_id, "MATH240");
    assert_eq!(payload.interactions.len(), 1);
    assert_eq!(payload.interactions[0].kind, InteractionKind::Like);
    assert_eq!(payload.interactions[0].referrer, "test");
  }

  #[tokio::test]
  async fn interactions_deleted_for_deleted_reviews() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let cookie = mock_login(session_store, "test", "test@mail.mcgill.ca").await;

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 1);

    let interaction = json! ({
      "kind": "like",
      "course_id": "MATH240",
      "user_id": "test",
      "referrer": "test"
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions")
          .body(Body::from(interaction))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    assert_eq!(
      db.interactions_for_review("MATH240", "test")
        .await
        .unwrap()
        .len(),
      1
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::DELETE)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(json!({"course_id": "MATH240"}).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("test").await.unwrap().len(), 0);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", cookie.clone())
          .header("Content-Type", "application/json")
          .uri("/api/interactions?course_id=MATH240&user_id=test&referrer=test")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(
      response.convert::<GetInteractionKindPayload>().await,
      GetInteractionKindPayload { kind: None }
    );
  }

  #[tokio::test]
  async fn notify_subscriber() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let (a, b) = (
      mock_login(session_store.clone(), "a", "a@mail.mcgill.ca").await,
      mock_login(session_store, "b", "b@mail.mcgill.ca").await,
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/subscriptions")
          .body(Body::from(json!({ "course_id": "MATH240" }).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert!(db.get_subscription("a", "MATH240").await.unwrap().is_some());

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", b)
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("b").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", a)
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.convert::<Vec<Notification>>().await.len(), 1);
  }

  #[tokio::test]
  async fn delete_subscription() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let (a, b) = (
      mock_login(session_store.clone(), "a", "a@mail.mcgill.ca").await,
      mock_login(session_store, "b", "b@mail.mcgill.ca").await,
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/subscriptions")
          .body(Body::from(json!({ "course_id": "MATH240" }).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert!(db.get_subscription("a", "MATH240").await.unwrap().is_some());

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", b)
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("b").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.convert::<Vec<Notification>>().await.len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::DELETE)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/subscriptions")
          .body(Body::from(json!({ "course_id": "MATH240" }).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", a)
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.convert::<Vec<Notification>>().await.len(), 0);
  }

  #[tokio::test]
  async fn delete_notifications() {
    let TestContext {
      db,
      mut app,
      session_store,
      ..
    } = TestContext::new().await;

    db.initialize(InitializeOptions {
      source: seed(),
      ..Default::default()
    })
    .await
    .unwrap();

    let (a, b) = (
      mock_login(session_store.clone(), "a", "a@mail.mcgill.ca").await,
      mock_login(session_store, "b", "b@mail.mcgill.ca").await,
    );

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/subscriptions")
          .body(Body::from(json!({ "course_id": "MATH240" }).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert!(db.get_subscription("a", "MATH240").await.unwrap().is_some());

    let review = json!({
      "content": "test",
      "course_id": "MATH240",
      "instructors": ["Adrian Roshan Vetta"],
      "rating": 5,
      "difficulty": 5
    })
    .to_string();

    let response = app
      .call(
        Request::builder()
          .method(http::Method::POST)
          .header("Cookie", b)
          .header("Content-Type", "application/json")
          .uri("/api/reviews")
          .body(Body::from(review))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(db.find_reviews_by_user_id("b").await.unwrap().len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.convert::<Vec<Notification>>().await.len(), 1);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::DELETE)
          .header("Cookie", a.clone())
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::from(json!({"course_id": "MATH240"}).to_string()))
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let response = app
      .call(
        Request::builder()
          .method(http::Method::GET)
          .header("Cookie", a)
          .header("Content-Type", "application/json")
          .uri("/api/notifications")
          .body(Body::empty())
          .unwrap(),
      )
      .await
      .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.convert::<Vec<Notification>>().await.len(), 0);
  }
}
