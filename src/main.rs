use {
  crate::{
    arguments::Arguments, loader::Loader, options::Options, page::Page,
    server::Server, state::State, subcommand::Subcommand, vec_ext::VecExt,
    vsb_client::VsbClient,
  },
  axum::Router,
  clap::Parser,
  db::Db,
  http::Method,
  model::{Course, CourseListing, Schedule},
  rayon::prelude::*,
  std::{
    fs, marker::Sized, net::SocketAddr, path::PathBuf, process, sync::Arc,
    thread, time::Duration,
  },
  tower_http::cors::{Any, CorsLayer},
};

mod arguments;
mod loader;
mod options;
mod page;
mod server;
mod state;
mod subcommand;
mod vec_ext;
mod vsb_client;

type Result<T = (), E = anyhow::Error> = std::result::Result<T, E>;

#[tokio::main]
async fn main() {
  env_logger::init();

  if let Err(error) = Arguments::parse().run().await {
    eprintln!("error: {error}");
    process::exit(1);
  }
}
