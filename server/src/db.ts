import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(process.env.DATABASE_PATH ?? "./server/data/blindcode.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export function transaction<T>(run: () => T): () => T {
  return () => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = run();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
}

db.exec(`
  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    prompt TEXT NOT NULL,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    examples_json TEXT NOT NULL,
    references_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    challenge_id TEXT NOT NULL REFERENCES challenges(id),
    status TEXT NOT NULL CHECK(status IN ('draft', 'active', 'closed', 'ended')),
    time_limit_seconds INTEGER NOT NULL CHECK(time_limit_seconds > 0),
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    started_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id),
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    score REAL NOT NULL,
    submitted_at INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('manual', 'timeout'))
  );
  CREATE TABLE IF NOT EXISTS participant_drafts (
    participant_id TEXT PRIMARY KEY REFERENCES participants(id),
    code TEXT NOT NULL,
    language TEXT NOT NULL CHECK(language IN ('cpp', 'c', 'java', 'python')),
    updated_at INTEGER NOT NULL
  );
`);

const seedChallenges = [
  {
    id: "two-sum",
    title: "Pair of Target",
    difficulty: "Easy",
    prompt: "Given an array of integers and a target value, return the zero-based indices of the two distinct elements whose sum equals the target. Exactly one solution exists. You may not use the same element twice.",
    inputFormat: "The first line contains n and target. The second line contains n space-separated integers.",
    outputFormat: "Print the two zero-based indices in ascending order.",
    examples: [
      { input: "4 9\n2 7 11 15", output: "0 1", explanation: "2 + 7 = 9." },
      { input: "3 6\n3 2 4", output: "1 2", explanation: "2 + 4 = 6." },
    ],
    references: {
      cpp: "#include <iostream>\n#include <unordered_map>\n#include <vector>\nusing namespace std;\nint main(){int n,target;cin>>n>>target;vector<int>a(n);for(int&x:a)cin>>x;unordered_map<int,int> seen;for(int i=0;i<n;i++){int need=target-a[i];if(seen.count(need)){cout<<seen[need]<<' '<<i;return 0;}seen[a[i]]=i;}}",
      c: "#include <stdio.h>\nint main(){int n,target;scanf(\"%d%d\",&n,&target);int a[100000];for(int i=0;i<n;i++)scanf(\"%d\",&a[i]);for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(a[i]+a[j]==target){printf(\"%d %d\",i,j);return 0;}}",
      java: "import java.util.*;\npublic class Main{public static void main(String[]args){Scanner s=new Scanner(System.in);int n=s.nextInt(),target=s.nextInt();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=s.nextInt();Map<Integer,Integer>seen=new HashMap<>();for(int i=0;i<n;i++){if(seen.containsKey(target-a[i])){System.out.print(seen.get(target-a[i])+\" \"+i);return;}seen.put(a[i],i);}}}",
      python: "n, target = map(int, input().split())\nvalues = list(map(int, input().split()))\nseen = {}\nfor i, value in enumerate(values):\n    if target - value in seen:\n        print(seen[target - value], i)\n        break\n    seen[value] = i",
    },
  },
  {
    id: "reverse-words",
    title: "Reverse the Words",
    difficulty: "Easy",
    prompt: "Read a line of text and print its words in reverse order, separated by a single space. Ignore leading, trailing, and repeated spaces.",
    inputFormat: "One line containing a sentence.",
    outputFormat: "The words in reverse order, separated by one space.",
    examples: [
      { input: "code without sight", output: "sight without code", explanation: "" },
      { input: "  hello   world  ", output: "world hello", explanation: "" },
    ],
    references: {
      cpp: "#include <iostream>\n#include <sstream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main(){string line,word;getline(cin,line);istringstream in(line);vector<string>words;while(in>>word)words.push_back(word);reverse(words.begin(),words.end());for(int i=0;i<words.size();i++){if(i)cout<<' ';cout<<words[i];}}",
      c: "#include <stdio.h>\n#include <string.h>\nint main(){char line[10000],*words[5000];int n=0;fgets(line,sizeof(line),stdin);char*p=strtok(line,\" \\t\\r\\n\");while(p){words[n++]=p;p=strtok(NULL,\" \\t\\r\\n\");}for(int i=n-1;i>=0;i--)printf(\"%s%s\",words[i],i?\" \":\"\");}",
      java: "import java.util.*;\npublic class Main{public static void main(String[]args){Scanner s=new Scanner(System.in);if(!s.hasNextLine())return;String[]words=s.nextLine().trim().split(\"\\\\s+\");if(words.length==1&&words[0].isEmpty())return;for(int i=words.length-1;i>=0;i--){if(i<words.length-1)System.out.print(\" \");System.out.print(words[i]);}}}",
      python: "words = input().split()\nprint(' '.join(reversed(words)))",
    },
  },
  {
    id: "fibonacci",
    title: "Fibonacci Number",
    difficulty: "Easy",
    prompt: "Given a non-negative integer n, print the nth Fibonacci number. The sequence starts with F(0) = 0 and F(1) = 1.",
    inputFormat: "A single integer n (0 <= n <= 90).",
    outputFormat: "Print F(n).",
    examples: [
      { input: "7", output: "13", explanation: "The sequence begins 0, 1, 1, 2, 3, 5, 8, 13." },
      { input: "0", output: "0", explanation: "" },
    ],
    references: {
      cpp: "#include <iostream>\nusing namespace std;\nint main(){int n;cin>>n;long long a=0,b=1;for(int i=0;i<n;i++){long long next=a+b;a=b;b=next;}cout<<a;}",
      c: "#include <stdio.h>\nint main(){int n;scanf(\"%d\",&n);long long a=0,b=1;for(int i=0;i<n;i++){long long next=a+b;a=b;b=next;}printf(\"%lld\",a);}",
      java: "import java.util.*;\npublic class Main{public static void main(String[]args){Scanner s=new Scanner(System.in);int n=s.nextInt();long a=0,b=1;for(int i=0;i<n;i++){long next=a+b;a=b;b=next;}System.out.print(a);}}",
      python: "n = int(input())\na, b = 0, 1\nfor _ in range(n):\n    a, b = b, a + b\nprint(a)",
    },
  },
];

const insertChallenge = db.prepare(`
  INSERT OR IGNORE INTO challenges
    (id, title, difficulty, prompt, input_format, output_format, examples_json, references_json, created_at)
  VALUES
    (@id, @title, @difficulty, @prompt, @inputFormat, @outputFormat, @examples, @references, @createdAt)
`);
const seed = transaction(() => {
  for (const challenge of seedChallenges) {
    insertChallenge.run({
      ...challenge,
      examples: JSON.stringify(challenge.examples),
      references: JSON.stringify(challenge.references),
      createdAt: Date.now(),
    });
  }
});
seed();
