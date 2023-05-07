use super::*;

pub(crate) trait VecExt<T> {
  fn combine(self, other: Vec<T>) -> Vec<T>;
  fn combine_option(self, other: Option<Vec<T>>) -> Vec<T>;
}

impl<T: Eq + Hash + Clone> VecExt<T> for Vec<T> {
  fn combine(self, other: Vec<T>) -> Vec<T> {
    [self, other].concat().iter().unique().cloned().collect()
  }

  fn combine_option(self, other: Option<Vec<T>>) -> Vec<T> {
    [self, other.unwrap_or(Vec::new())]
      .concat()
      .iter()
      .unique()
      .cloned()
      .collect()
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn combine() {
    assert_eq!(
      vec![1, 2, 3].combine(vec![1, 2, 3, 4, 5, 6]),
      vec![1, 2, 3, 4, 5, 6]
    );
  }

  #[test]
  fn combine_option() {
    assert_eq!(
      vec![1, 2, 3].combine_option(Some(vec![1, 2, 3, 4, 5, 6])),
      vec![1, 2, 3, 4, 5, 6]
    );
  }

  #[test]
  fn combine_option_none() {
    assert_eq!(vec![1, 2, 3].combine_option(None), vec![1, 2, 3]);
  }
}
