export type Block = {
  campus?: string;
  display?: string;
  location?: string;
  timeBlocks: TimeBlock[];
};

export type TimeBlock = {
  day?: string;
  t1?: string;
  t2?: string;
};

export type Schedule = {
  blocks?: Block[];
  term?: string;
};
