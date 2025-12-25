CREATE TABLE commits (
  hash TEXT NOT NULL,
  message TEXT,
  author_name TEXT,
  author_email TEXT,
  author_when DATETIME,
  committer_name TEXT,
  committer_email TEXT,
  committer_when DATETIME,
  parents INT
);

CREATE TABLE files (
  path TEXT,
  executable INT,
  contents BLOB
);

CREATE TABLE stats (
  file_path TEXT,
  additions INT,
  deletions INT,
  old_file_mode TEXT,
  new_file_mode TEXT
);

CREATE TABLE refs (
  name TEXT NOT NULL,
  type TEXT,
  remote TEXT,
  full_name TEXT,
  hash TEXT,
  target TEXT
);
