type Timestamp = {
  $date: {
    $numberLong: string;
  };
};

export type Review = {
  content: string;
  courseId: string;
  instructors: string[];
  rating: number; // 0-5
  difficulty: number; // 0-5
  timestamp: Timestamp;
  userId: string;
  likes: number;
  matches?: [number, number][];
};
