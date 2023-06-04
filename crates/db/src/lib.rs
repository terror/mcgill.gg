use {
  anyhow::anyhow,
  futures::Future,
  futures::{future::join_all, TryStreamExt},
  itertools::Itertools,
  lazy_static::lazy_static,
  log::{info, warn},
  model::{Course, Instructor, Review, SearchResults, SeedOptions},
  mongodb::{
    bson::{doc, Document},
    options::UpdateModifications,
    options::{ClientOptions, FindOptions, IndexOptions},
    results::{CreateIndexResult, DeleteResult, InsertOneResult, UpdateResult},
    Client, Cursor, Database, IndexModel,
  },
  serde::{de::DeserializeOwned, Serialize},
  std::{collections::HashSet, fs, hash::Hash, path::PathBuf},
  {
    crate::combine::Combine, collector::Collector, seed::Seed, seeder::Seeder,
    str_ext::StrExt,
  },
};

#[cfg(test)]
use {
  bson::DateTime,
  chrono::prelude::*,
  include_dir::{include_dir, Dir},
  std::sync::atomic::{AtomicUsize, Ordering},
  tempdir::TempDir,
};

type Result<T = (), E = anyhow::Error> = std::result::Result<T, E>;

mod collector;
mod combine;
mod db;
mod seed;
mod seeder;
mod str_ext;

pub use crate::db::Db;
