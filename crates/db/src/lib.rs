use {
  bson::Bson,
  chrono::{Datelike, Utc},
  futures::Future,
  futures::{future::join_all, TryStreamExt},
  itertools::Itertools,
  lazy_static::lazy_static,
  log::{info, warn},
  model::{
    Course, CourseFilter, InitializeOptions, Instructor, Interaction,
    Notification, Review, SearchResults, Subscription,
  },
  mongodb::{
    bson::{doc, Document},
    options::UpdateModifications,
    options::{ClientOptions, FindOptions, IndexOptions, UpdateOptions},
    results::{CreateIndexResult, DeleteResult, InsertOneResult, UpdateResult},
    Client, Cursor, Database, IndexModel,
  },
  serde::{de::DeserializeOwned, Serialize},
  std::{collections::HashSet, env, fs, hash::Hash, path::PathBuf},
  {
    crate::combine::Combine, initializer::Initializer, seed::Seed,
    str_ext::StrExt,
  },
};

#[cfg(test)]
use {
  bson::DateTime,
  include_dir::{include_dir, Dir},
  model::InteractionKind,
  std::sync::atomic::{AtomicUsize, Ordering},
  tempdir::TempDir,
};

type Result<T = (), E = anyhow::Error> = std::result::Result<T, E>;

mod combine;
mod db;
mod initializer;
mod seed;
mod str_ext;

pub use crate::db::Db;
