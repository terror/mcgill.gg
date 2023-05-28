use {
  anyhow::anyhow,
  futures::{future::join_all, TryStreamExt},
  itertools::Itertools,
  lazy_static::lazy_static,
  log::{info, warn},
  model::{Course, Instructor, Review, SearchResults},
  mongodb::{
    bson::{doc, Document},
    options::UpdateModifications,
    options::{ClientOptions, FindOptions, IndexOptions},
    results::{CreateIndexResult, DeleteResult, InsertOneResult, UpdateResult},
    Client, Cursor, Database, IndexModel,
  },
  serde::{de::DeserializeOwned, Serialize},
  std::{collections::HashSet, fs, hash::Hash, path::PathBuf},
  {crate::combine::Combine, seed::Seed, str_ext::StrExt},
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

mod combine;
mod db;
mod seed;
mod str_ext;

pub use crate::db::Db;
