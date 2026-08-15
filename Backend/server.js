const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require('cheerio');
const fs = require('fs');

// const bcrypt = require('bcrypt');
// Load environment variables from .env file
dotenv.config();
const app = express();
app.use(cors({
  origin: "*", // Replace with your frontend domain
  methods: "GET,POST,PUT,DELETE", // Allowed methods
  allowedHeaders: "Content-Type,Authorization", // Allowed headers
  credentials: true, // If using cookies or authentication
}));
// app.use(express.json()); // to handle JSON data
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // serve uploaded files statically
app.use("/uploads", express.static("uploads"));



// // MySQL Database Connection
// const db = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     port: process.env.DB_PORT,
//     charset: "utf8mb4",
// });

// // Connect to MySQL
// db.connect((err) => {
//     if (err) {
//         console.error('Database connection failed: ' + err.message);
//         return;
//     }
//     console.log('Connected to MySQL database');
// });


// MySQL Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the pool on startup (optional, but useful to confirm connectivity)
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.message);
        return;
    }
    console.log('Connected to MySQL database');
    connection.release();
});


const generateToken = () => {
  return Math.random().toString(36).substr(2) + new Date().getTime();
};




//All Get Methods

// Test Route to check connection
app.get('/', (req, res) => {
    res.send('Hello, MySQL connection is successful!');
});

// app.get('/testimonial', (req, res) => {
//     const sql = 'SELECT * FROM testimonial';
//     db.query(sql, (err, result) => {
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }
//         if (result.length === 0) {
//             return res.status(404).json({ message: 'No testimonials found' });
//         }
//         res.json(result);
//     });
// });

app.get('/testimonial', (req, res) => {
    const sql = 'SELECT * FROM testimonial';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result); // ✅ empty array [] if no rows — no need for 404
    });
});

app.get("/testimonial/:id", async (req, res) => {
    const { id } = req.params;
    res.send(`You are trying to access testimonial with ID: ${id}`);
 });

 app.get("/colleges", (req, res) => {
    const sqlQuery = "SELECT * FROM colleges";
    
    db.query(sqlQuery, (err, result) => {
        if (err) {
            console.error("Error fetching colleges:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json(result);
    });
});

app.get("/colleges/:id", (req, res) => {
  const sqlQuery = "SELECT * FROM colleges where id=?";
  const { id } = req.params;
  db.query(sqlQuery,[id], (err, result) => {
      if (err) {
          console.error("Error fetching colleges:", err);
          return res.status(500).json({ message: "Database error" });
      }
      res.status(200).json(result);
  });
});

app.get("/batches/id/:batchId", (req, res) => {
    const { batchId } = req.params;
  
    db.query("SELECT * FROM batches WHERE id = ?", [batchId], (err, results) => {
      if (err) {
        console.error("Error fetching batch:", err);
        return res.status(500).json({ error: "Failed to fetch batch" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(results[0]); // Return single batch object
    });
});


app.get("/batches", (req, res) => {
    db.query("SELECT * FROM batches", (err, results) => {
      if (err) {
        console.error("Error fetching batches:", err);
        return res.status(500).json({ error: "Failed to fetch batches" });
      }
      res.json(results);
    });
});

app.get("/batches/:c_id", (req, res) => {
    const { c_id } = req.params;
    db.query("SELECT * FROM batches WHERE c_id = ?", [c_id], (err, results) => {
      if (err) {
        console.error("Error fetching batches:", err);
        return res.status(500).json({ error: "Failed to fetch batches" });
      }
      res.json(results);
    });
});

app.get('/students', (req, res) => {
    const query = `
        SELECT s.id, s.name, s.mail, s.phone, s.registerNumber, 
               s.department, s.passedOutYear, 
               c.collegename, b.batchname
        FROM students s
        JOIN batches b ON s.b_id = b.id
        JOIN colleges c ON s.c_id = c.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(results);
    });
});

app.get('/students/count', (req, res) => {
  const { batchId } = req.query;

  if (!batchId) {
    return res.status(400).json({ error: 'Batch ID is required' });
  }

  const query = `SELECT COUNT(*) AS studentCount FROM students WHERE b_id = ?`;

  db.query(query, [batchId], (err, results) => {
    if (err) {
      console.error('Error fetching student count:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No students found for this batch' });
    }

    res.json({ studentCount: results[0]["studentCount"] });  // Using bracket notation
  });
});

app.get("/students/:b_id", (req, res) => {
  const { b_id } = req.params;
  
  const query = `
    SELECT s.id, s.name, s.mail, s.phone, s.registerNumber, 
           s.department, s.passedOutYear, 
           c.collegename, b.batchname
    FROM students s
    JOIN batches b ON s.b_id = b.id
    JOIN colleges c ON s.c_id = c.id
    WHERE s.b_id = ?
  `;

  db.query(query, [b_id], (err, results) => {
    if (err) {
      console.error("Error fetching students:", err);
      return res.status(500).json({ error: "Failed to fetch students" });
    }
    res.json(results);
  });
});


app.get("/topics",(req,res)=>{
  const sql=`select t.id as id,m.course_id,t.module_id from topics t join modules m on m.id=t.module_id`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching topics:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json(result);
  });
})

app.get("/trainers", (req, res) => {
  const sqlQuery = `
    SELECT 
      t.id,
      t.name, 
      t.email, 
      t.password, 
      t.phone,
      t.type,
      t.core, 
      c.collegeName AS college, 
      b.batchName AS batch, 
      t.resume_path
    FROM trainers t
    JOIN batches b ON t.b_id = b.id
    JOIN colleges c ON t.c_id = c.id
  `;

  db.query(sqlQuery, (err, result) => {
    if (err) {
      console.error("Error fetching trainers:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json(result);
  });
});

app.get('/courses', (req, res) => {
  const query = `
      SELECT *
      FROM courses`;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching courses:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(results);
  });
});

app.get("/modules/:courseId", (req, res) => {
  const { courseId } = req.params;
  const query = "SELECT * FROM modules WHERE course_id = ?";
  db.query(query, [courseId], (err, results) => {
    if (err) {
      console.error("Error fetching modules:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/topics/:module_id", (req, res) => {
  const { module_id } = req.params;
  db.query("SELECT * FROM topics WHERE module_id = ?", [module_id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Error fetching topics" });
    }
    res.json(results);
  });
});

app.get("/mcq/:topicId", (req, res) => {
  const { topicId } = req.params;
  db.query("SELECT * FROM mcq WHERE topic_id = ?", [topicId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.get("/coding/:topicId", (req, res) => {
  const { topicId } = req.params;
  db.query("SELECT * FROM coding WHERE topic_id = ?", [topicId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});


// app.get("/course-details", (req, res) => {
//   const { course_id } = req.query;

//   if (!course_id) {
//       return res.status(400).json({ error: "Missing required query parameter: course_id" });
//   }

//   const query = `
//       SELECT 
//     c.id AS course_id,
//     c.course_name AS course_name,
//     COUNT(DISTINCT md.id) AS total_modules,
//     COUNT(DISTINCT t.id) AS total_topics,

//     -- Subquery to count MCQs linked to topics in each course
//     (SELECT COUNT(m.id)
//      FROM modules md2
//      JOIN topics t2 ON md2.id = t2.module_id
//      JOIN mcq m ON t2.id = m.topic_id
//      WHERE md2.course_id = c.id) AS total_mcqs,

//     -- Subquery to count Coding questions linked to topics in each course
//     (SELECT COUNT(cd.id)
//      FROM modules md3
//      JOIN topics t3 ON md3.id = t3.module_id
//      JOIN coding cd ON t3.id = cd.topic_id
//      WHERE md3.course_id = c.id) AS total_coding_questions

//   FROM 
//       courses AS c
//   LEFT JOIN 
//       modules AS md ON c.id = md.course_id
//   LEFT JOIN 
//       topics AS t ON md.id = t.module_id
//   where c.id=?
//   GROUP BY 
//       c.id, c.course_name;`;

//   db.query(query, [course_id], (err, results) => {
//       if (err) {
//           console.error("Error fetching course details:", err);
//           return res.status(500).json({ error: "Database error" });
//       }

//       if (results.length === 0) {
//           return res.status(404).json({ error: "Course not found or no data available" });
//       }

//       res.json(results[0]);
//   });
// });

app.get("/course-details", (req, res) => {
  const { course_id, batch_id } = req.query;

  if (!course_id || !batch_id) {
      return res.status(400).json({ error: "Missing required query parameters: course_id and batch_id" });
  }

  const query = `
      SELECT 
          c.id AS course_id,
          c.course_name AS course_name,
          COUNT(DISTINCT md.id) AS total_modules,
          COUNT(DISTINCT t.id) AS total_topics,

          -- Count MCQs for the given batch_id
          (SELECT COUNT(aq.id)
           FROM allocate_questions aq
           WHERE aq.course_id = c.id
             AND aq.batch_id = ?
             AND aq.type = 'mcq') AS total_mcqs,

          -- Count Coding questions for the given batch_id
          (SELECT COUNT(aq.id)
           FROM allocate_questions aq
           WHERE aq.course_id = c.id
             AND aq.batch_id = ?
             AND aq.type = 'coding') AS total_coding_questions

      FROM 
          courses AS c
      LEFT JOIN 
          modules AS md ON c.id = md.course_id
      LEFT JOIN 
          topics AS t ON md.id = t.module_id
      WHERE 
          c.id = ?
      GROUP BY 
          c.id, c.course_name;`;

  db.query(query, [batch_id, batch_id, course_id], (err, results) => {
      if (err) {
          console.error("Error fetching course details:", err);
          return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: "Course not found or no data available" });
      }

      res.json(results[0]);
  });
});

// app.get("/module-details", (req, res) => {
//   const { module_id } = req.query;

//   if (!module_id) {
//     return res.status(400).json({ error: "Missing required query parameter: module_id" });
//   }

//   const query = `
//     SELECT 
//       md.id AS module_id,
//       md.module_name AS module_name,
//       COUNT(DISTINCT t.id) AS total_topics,
//       -- Subquery to count MCQs linked to topics in this module
//       (SELECT COUNT(m.id)
//        FROM topics t2
//        JOIN mcq m ON t2.id = m.topic_id
//        WHERE t2.module_id = md.id) AS total_mcqs,
//       -- Subquery to count Coding questions linked to topics in this module
//       (SELECT COUNT(cd.id)
//        FROM topics t3
//        JOIN coding cd ON t3.id = cd.topic_id
//        WHERE t3.module_id = md.id) AS total_coding_questions
//     FROM 
//       modules AS md
//     LEFT JOIN 
//       topics AS t ON md.id = t.module_id
//     WHERE 
//       md.id = ?
//     GROUP BY 
//       md.id, md.module_name;
//   `;

//   db.query(query, [module_id], (err, results) => {
//     if (err) {
//       console.error("Error fetching module details:", err);
//       return res.status(500).json({ error: "Database error" });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ error: "Module not found or no data available" });
//     }

//     res.json(results[0]);
//   });
// });

app.get("/module-details", (req, res) => {
  const { module_id, batch_id } = req.query;

  if (!module_id || !batch_id) {
    return res.status(400).json({ error: "Missing required query parameters: module_id and batch_id" });
  }

  const query = `
    SELECT 
      md.id AS module_id,
      md.module_name AS module_name,
      COUNT(DISTINCT t.id) AS total_topics,

      -- Count MCQs for the given batch_id and module_id
      (SELECT COUNT(aq.id)
       FROM allocate_questions aq
       WHERE aq.module_id = md.id
         AND aq.batch_id = ?
         AND aq.type = 'mcq') AS total_mcqs,

      -- Count Coding questions for the given batch_id and module_id
      (SELECT COUNT(aq.id)
       FROM allocate_questions aq
       WHERE aq.module_id = md.id
         AND aq.batch_id = ?
         AND aq.type = 'coding') AS total_coding_questions

    FROM 
      modules AS md
    LEFT JOIN 
      topics AS t ON md.id = t.module_id
    WHERE 
      md.id = ?
    GROUP BY 
      md.id, md.module_name;
  `;

  db.query(query, [batch_id, batch_id, module_id], (err, results) => {
    if (err) {
      console.error("Error fetching module details:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Module not found or no data available" });
    }

    res.json(results[0]);
  });
});

// app.get("/topic-details", (req, res) => {
//   const { topic_id } = req.query;

//   if (!topic_id) {
//     return res.status(400).json({ error: "Missing required query parameter: topic_id" });
//   }

//   const query = `
//     SELECT 
//       t.id AS topic_id,
//       t.topic_name AS topic_name,
//       -- Count MCQs linked to this topic
//       (SELECT COUNT(m.id)
//        FROM mcq m
//        WHERE m.topic_id = t.id) AS total_mcqs,
//       -- Count Coding questions linked to this topic
//       (SELECT COUNT(cd.id)
//        FROM coding cd
//        WHERE cd.topic_id = t.id) AS total_coding_questions,
//       -- Count Notes linked to this topic
//       (SELECT COUNT(un.id)
//        FROM upload_notes un
//        WHERE un.topic_id = t.id) AS total_notes
//     FROM 
//       topics AS t
//     WHERE 
//       t.id = ?;
//   `;

//   db.query(query, [topic_id], (err, results) => {
//     if (err) {
//       console.error("Error fetching topic details:", err);
//       return res.status(500).json({ error: "Database error" });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ error: "Topic not found or no data available" });
//     }

//     res.json(results[0]);
//   });
// });

app.get("/topic-details", (req, res) => {
  const { topic_id, batch_id } = req.query;

  if (!topic_id || !batch_id) {
    return res.status(400).json({ error: "Missing required query parameters: topic_id and batch_id" });
  }

  const query = `
    SELECT 
      t.id AS topic_id,
      t.topic_name AS topic_name,

      -- Count MCQs for the given batch_id and topic_id
      (SELECT COUNT(aq.id)
       FROM allocate_questions aq
       WHERE aq.topic_id = t.id
         AND aq.batch_id = ?
         AND aq.type = 'mcq') AS total_mcqs,

      -- Count Coding questions for the given batch_id and topic_id
      (SELECT COUNT(aq.id)
       FROM allocate_questions aq
       WHERE aq.topic_id = t.id
         AND aq.batch_id = ?
         AND aq.type = 'coding') AS total_coding_questions,

      -- Count Notes for the given batch_id and topic_id
      (SELECT COUNT(un.id)
       FROM upload_notes un
       WHERE un.topic_id = t.id
         AND un.b_id = ?) AS total_notes

    FROM 
      topics AS t
    WHERE 
      t.id = ?;
  `;

  db.query(query, [batch_id, batch_id, batch_id, topic_id], (err, results) => {
    if (err) {
      console.error("Error fetching topic details:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Topic not found or no data available" });
    }

    res.json(results[0]);
  });
});

app.get('/api/jobs', (req, res) => {
  const query = 'SELECT * FROM jobs';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error!' });
    }
    res.status(200).json(results);
  });
});

app.get("/allocations", (req, res) => {
  const { batch_id, topic_id, type } = req.query;

  // Validate required query parameters
  if (!batch_id || !topic_id || !type) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  let query = "";
  let values = [batch_id, topic_id, type]; // Include type in the values array

  if (type === "mcq") {
    query = `
      SELECT 
        aq.id AS allocation_id,
        aq.batch_id,
        aq.topic_id,
        aq.question_id,
        aq.type,
        aq.allocation_type,
        aq.completion_status,
        m.question,
        m.option1,
        m.option2,
        m.option3,
        m.option4,
        m.correct_answer
      FROM allocate_questions aq
      LEFT JOIN mcq m ON aq.question_id = m.id
      WHERE aq.batch_id = ? AND aq.topic_id = ? AND aq.type = ?
    `;
  } else if (type === "coding") {
    query = `
      SELECT 
        aq.id AS allocation_id,
        aq.batch_id,
        aq.topic_id,
        aq.question_id,
        aq.type,
        aq.allocation_type,
        aq.completion_status,
        c.title,
        c.question,
        c.level,
        c.platform_source,
        c.platform_link,
        c.youtube_links
      FROM allocate_questions aq
      LEFT JOIN coding c ON aq.question_id = c.id
      WHERE aq.batch_id = ? AND aq.topic_id = ? AND aq.type = ?
    `;
  } else {
    return res.status(400).json({ error: "Invalid type parameter" });
  }

  // Execute the query
  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Error fetching allocated questions:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Send the results as JSON
    res.json(results);
  });
});

app.get("/allocated-courses/:batchId", (req, res) => {
  const batchId = req.params.batchId;
  
  const query = `
    SELECT ac.course_id, c.course_name 
    FROM allocate_courses ac
    JOIN courses c ON ac.course_id = c.id
    WHERE ac.batch_id = ?;
  `;

  db.query(query, [batchId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get('/announcements', (req, res) => {
  const { batch_id, college_id } = req.query;
  const sql = 'SELECT * FROM announcements WHERE batch_id = ? AND college_id = ? ORDER BY created_at DESC';
  
  db.query(sql, [batch_id, college_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }
    res.json(results);
  });
});




// app.get('/allocations', (req, res) => {
//   const { batch_id, topic_id, type } = req.query;

//   // Validate required query parameters
//   if (!batch_id || !topic_id || !type) {
//     return res.status(400).json({ error: 'Missing required query parameters: batch_id, topic_id, or type' });
//   }

//   // SQL query to fetch allocations
//   const sql = `
//     SELECT question_id, allocation_type,completion_status
//     FROM allocate_questions
//     WHERE batch_id = ? AND topic_id = ? AND type = ?;
//   `;

//   // Execute the query
//   db.query(sql, [batch_id, topic_id, type], (err, results) => {
//     if (err) {
//       console.error('Error fetching allocations:', err);
//       return res.status(500).json({ error: 'Failed to fetch allocations' });
//     }

//     // Return the results as JSON
//     res.json(results);
//   });
// });

// app.get('/topic-completion-status', (req, res) => {
//   const { topic_id } = req.query;

//   if (!topic_id) {
//     return res.status(400).json({ error: 'topic_id is required as a query parameter.' });
//   }

//   // SQL query to fetch total questions and completed questions for the topic
//   const sql = `
//     SELECT 
//       COUNT(*) AS total_qus,
//       SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
//     FROM allocate_questions
//     WHERE topic_id = ?;
//   `;

//   // Execute the query
//   db.query(sql, [topic_id], (err, results) => {
//     if (err) {
//       console.error('Error fetching completion status:', err);
//       return res.status(500).json({ error: 'Failed to fetch completion status.' });
//     }

//     // Return the result
//     res.json({
//       topic_id: parseInt(topic_id),
//       total_qus: results[0].total_qus,
//       completed_qus: results[0].completed_qus,
//     });
//   });
// });

// app.get('/module-completion-status', (req, res) => {
//   const { module_id } = req.query;

//   if (!module_id) {
//     return res.status(400).json({ error: 'topic_id is required as a query parameter.' });
//   }

//   // SQL query to fetch total questions and completed questions for the topic
//   const sql = `
//     SELECT 
//       COUNT(*) AS total_qus,
//       SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
//     FROM allocate_questions
//     WHERE module_id = ?;
//   `;

//   // Execute the query
//   db.query(sql, [module_id], (err, results) => {
//     if (err) {
//       console.error('Error fetching completion status:', err);
//       return res.status(500).json({ error: 'Failed to fetch completion status.' });
//     }

//     // Return the result
//     res.json({
//       module_id: parseInt(module_id),
//       total_qus: results[0].total_qus,
//       completed_qus: results[0].completed_qus,
//     });
//   });
// });

// app.get('/course-completion-status', (req, res) => {
//   const { course_id } = req.query;

//   if (!course_id) {
//     return res.status(400).json({ error: 'topic_id is required as a query parameter.' });
//   }

//   // SQL query to fetch total questions and completed questions for the topic
//   const sql = `
//     SELECT 
//       COUNT(*) AS total_qus,
//       SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
//     FROM allocate_questions
//     WHERE course_id = ?;
//   `;

//   // Execute the query
//   db.query(sql, [course_id], (err, results) => {
//     if (err) {
//       console.error('Error fetching completion status:', err);
//       return res.status(500).json({ error: 'Failed to fetch completion status.' });
//     }

//     // Return the result
//     res.json({
//       course_id: parseInt(course_id),
//       total_qus: results[0].total_qus,
//       completed_qus: results[0].completed_qus,
//     });
//   });
// });



app.get('/topic-completion-status', (req, res) => {
  const { topic_id, batch_id } = req.query;

  if (!topic_id || !batch_id) {
    return res.status(400).json({ error: 'topic_id and batch_id are required as query parameters.' });
  }

  // SQL query to fetch total questions and completed questions for the topic and batch
  const sql = `
    SELECT 
      COUNT(*) AS total_qus,
      SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
    FROM allocate_questions
    WHERE topic_id = ? AND batch_id = ?;
  `;

  // Execute the query
  db.query(sql, [topic_id, batch_id], (err, results) => {
    if (err) {
      console.error('Error fetching completion status:', err);
      return res.status(500).json({ error: 'Failed to fetch completion status.' });
    }

    // Return the result
    res.json({
      topic_id: parseInt(topic_id),
      batch_id: parseInt(batch_id),
      total_qus: results[0].total_qus,
      completed_qus: results[0].completed_qus,
    });
  });
});

app.get('/module-completion-status', (req, res) => {
  const { module_id, batch_id } = req.query;

  if (!module_id || !batch_id) {
    return res.status(400).json({ error: 'module_id and batch_id are required as query parameters.' });
  }

  // SQL query to fetch total questions and completed questions for the module and batch
  const sql = `
    SELECT 
      COUNT(*) AS total_qus,
      SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
    FROM allocate_questions
    WHERE module_id = ? AND batch_id = ?;
  `;

  // Execute the query
  db.query(sql, [module_id, batch_id], (err, results) => {
    if (err) {
      console.error('Error fetching completion status:', err);
      return res.status(500).json({ error: 'Failed to fetch completion status.' });
    }

    // Return the result
    res.json({
      module_id: parseInt(module_id),
      batch_id: parseInt(batch_id),
      total_qus: results[0].total_qus,
      completed_qus: results[0].completed_qus,
    });
  });
});

app.get('/course-completion-status', (req, res) => {
  const { course_id, batch_id } = req.query;

  if (!course_id || !batch_id) {
    return res.status(400).json({ error: 'course_id and batch_id are required as query parameters.' });
  }

  // SQL query to fetch total questions and completed questions for the course and batch
  const sql = `
    SELECT 
      COUNT(*) AS total_qus,
      SUM(CASE WHEN completion_status = 1 THEN 1 ELSE 0 END) AS completed_qus
    FROM allocate_questions
    WHERE course_id = ? AND batch_id = ?;
  `;

  // Execute the query
  db.query(sql, [course_id, batch_id], (err, results) => {
    if (err) {
      console.error('Error fetching completion status:', err);
      return res.status(500).json({ error: 'Failed to fetch completion status.' });
    }

    // Return the result
    res.json({
      course_id: parseInt(course_id),
      batch_id: parseInt(batch_id),
      total_qus: results[0].total_qus,
      completed_qus: results[0].completed_qus,
    });
  });
});

app.get('/api/mentors', (req, res) => {
  const sql = 'SELECT * FROM mentors'; // Fetch all columns from the mentors table

  db.query(sql, (err, results) => {
      if (err) {
          console.error('Error fetching mentors:', err);
          return res.status(500).json({ success: false, message: 'Failed to fetch mentors' });
      }
      res.status(200).json({ success: true, mentors: results });
  });
});

app.get('/api/check-booking/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const query = `
      SELECT COUNT(*) AS booking_count, MAX(created_at) AS last_booking_date
      FROM booked_Mentors
      WHERE student_id = ?
  `;

  db.query(query, [studentId], (err, results) => {
      if (err) {
          console.error('Error checking booking:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      const { booking_count, last_booking_date } = results[0];
      const maxBookings = 6;
      const cooldownPeriod = 30; // 30 days

      // Check if the student has reached the maximum number of bookings
      if (booking_count >= maxBookings) {
          return res.json({
              canBook: false,
              message: 'You have already booked six mentors. Please wait for the next booking cycle.',
          });
      }

      // Check if the student has booked a mentor within the last 30 days
      if (last_booking_date) {
          const lastBookingDate = new Date(last_booking_date);
          const currentDate = new Date();
          const daysSinceLastBooking = Math.floor((currentDate - lastBookingDate) / (1000 * 60 * 60 * 24));

          if (daysSinceLastBooking < cooldownPeriod) {
              return res.json({
                  canBook: false,
                  message: `You can book your next mentor after ${cooldownPeriod - daysSinceLastBooking} days.`,
              });
          }
      }

      // If all checks pass, allow booking
      res.json({ canBook: true });
  });
});

app.get('/api/get-booked-mentors/:studentId', (req, res) => {
  const studentId = req.params.studentId;

  // Query to fetch joined data from booked_Mentors and mentors tables
  const sql = `
    SELECT 
      booked_Mentors.id AS booking_id,
      booked_Mentors.reason,
      booked_Mentors.focus_on,
      booked_Mentors.created_at AS booking_date,
      booked_Mentors.status,
      booked_Mentors.status_result,
      mentors.id AS mentor_id,
      mentors.name AS mentor_name,
      mentors.role AS mentor_role,
      mentors.company AS mentor_company,
      mentors.companyLogo AS mentor_company_logo,
      mentors.experience AS mentor_experience,
      mentors.photo AS mentor_photo,
      mentors.location AS mentor_location,
      mentors.aboutMentor AS mentor_about
    FROM booked_Mentors
    INNER JOIN mentors ON booked_Mentors.mentor_id = mentors.id
    WHERE booked_Mentors.student_id = ?
  `;

  // Execute the query
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error('Error fetching booked mentors:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch booked mentors' });
    }

    // If no bookings are found for the student_id
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No booked mentors found for this student.',
        data: [],
      });
    }

    // If bookings are found, return the data
    res.status(200).json({ success: true, data: results });
  });
});


// Example using Express.js

app.get('/api/booked-mentors', (req, res) => {
  const sql = `
    SELECT distinct m.id,m.name,m.role,m.company,m.companyLogo,m.experience,m.photo,m.location,m.email,m.phone
    FROM booked_mentors bm
    JOIN mentors m ON bm.mentor_id = m.id
  `;

  db.query(sql, (err, bookedMentors) => {
    if (err) {
      console.error('Error fetching booked mentors:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch booked mentors' });
    }
    res.json(bookedMentors);
  });
});

app.get('/api/students-by-mentor/:mentorId', (req, res) => {
  const { mentorId } = req.params;
  const sql = `
   SELECT 
      s.*, 
      bm.status, 
      DATE_FORMAT(bm.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,  -- Format created_at
      bm.status_result,
      c.collegeName AS college_name,  -- Fetch college name
      b.batchName AS batch_name       -- Fetch batch name
    FROM booked_mentors bm
    JOIN students s ON bm.student_id = s.id
    JOIN colleges c ON s.c_id = c.id  -- Join colleges table
    JOIN batches b ON s.b_id = b.id   -- Join batches table
    WHERE bm.mentor_id = ?
  `;

  db.query(sql, [mentorId], (err, students) => {
    if (err) {
      console.error('Error fetching students by mentor:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch students by mentor' });
    }
    res.json(students);
  });
});


// Fetch Notes Endpoint
app.get("/api/student-coding-notes", (req, res) => {
  const { student_id, question_id } = req.query;

  if (!student_id || !question_id) {
    return res.status(400).json({ error: "student_id and question_id are required" });
  }

  const query = `
    SELECT notes 
    FROM student_coding_notes 
    WHERE student_id = ? AND question_id = ?
  `;

  db.query(query, [student_id, question_id], (err, results) => {
    if (err) {
      console.error("Error fetching notes:", err);
      return res.status(500).json({ error: "Failed to fetch notes" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No notes found" });
    }

    res.json({ notes: results[0].notes });
  });
});


app.get('/mock-bookings', (req, res) => {
  const { studentId } = req.params;

  const query = `
    SELECT 
      mock.id, 
      mock.student_id, 
      mock.course_id, 
      courses.course_name, 
      mock.prefer_date1, 
      mock.prefer_date2, 
      mock.prefer_date3, 
      mock.status, 
      mock.status_result, 
      mock.booked_at,
      mock.certificate, 
      students.c_id, 
      students.b_id,
      students.name,
      students.mail,
      students.phone,
      students.registerNumber,
      colleges.collegeName AS college_name,
      batches.batchName AS batch_name
    FROM 
      mock
    JOIN 
      courses 
    ON 
      mock.course_id = courses.id
    JOIN 
      students 
    ON 
      mock.student_id = students.id
    LEFT JOIN 
      colleges 
    ON 
      students.c_id = colleges.id
    LEFT JOIN 
      batches 
    ON 
      students.b_id = batches.id
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching mock bookings:", err);
      return res.status(500).json({ error: "Failed to fetch mock bookings" });
    }

    res.json(results);
  });
});


// GET endpoint to fetch mock bookings for a student
app.get('/mock-bookings/:studentId', (req, res) => {
  const { studentId } = req.params;

  const query = `
    SELECT 
      mock.id, 
      mock.student_id, 
      mock.course_id, 
      courses.course_name, 
      mock.prefer_date1, 
      mock.prefer_date2, 
      mock.prefer_date3, 
      mock.status, 
      mock.status_result, 
      mock.booked_at,
      mock.certificate, 
      students.c_id, 
      students.b_id,
      colleges.collegeName AS college_name,
      batches.batchName AS batch_name
    FROM 
      mock
    JOIN 
      courses 
    ON 
      mock.course_id = courses.id
    JOIN 
      students 
    ON 
      mock.student_id = students.id
    LEFT JOIN 
      colleges 
    ON 
      students.c_id = colleges.id
    LEFT JOIN 
      batches 
    ON 
      students.b_id = batches.id
    WHERE 
      mock.student_id = ?;
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error("Error fetching mock bookings:", err);
      return res.status(500).json({ error: "Failed to fetch mock bookings" });
    }

    res.json(results);
  });
});

app.get("/get-mock-count", (req, res) => {
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  const query = "SELECT COUNT(*) AS mock_count FROM mock WHERE student_id = ?";

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error("Error fetching mock count:", err);
      return res.status(500).json({ message: "Failed to fetch mock count" });
    }

    res.status(200).json({ mock_count: results[0].mock_count });
  });
});

app.get("/get-certificate-count", (req, res) => {
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  const query = "SELECT COUNT(*) AS certificate_count FROM mock WHERE student_id = ? AND status = 'completed'";


  db.query(query, [student_id,], (err, results) => {
    if (err) {
      console.error("Error fetching certificate count:", err);
      return res.status(500).json({ message: "Failed to fetch certificate count" });
    }

    res.status(200).json({ certificate_count: results[0].certificate_count });
  });
});


app.get("/get-mentor-count", (req, res) => {
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  const query = "SELECT COUNT(*) AS mentor_count FROM booked_mentors WHERE student_id = ?";

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error("Error fetching mentor count:", err);
      return res.status(500).json({ message: "Failed to fetch mentor count" });
    }

    res.status(200).json({ mentor_count: results[0].mentor_count });
  });
});

app.get("/get-support-count", (req, res) => {
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  const query = "SELECT COUNT(*) AS support_count FROM student_support WHERE student_id = ?";

  db.query(query, [student_id], (err, results) => {
    if (err) {
      console.error("Error fetching support count:", err);
      return res.status(500).json({ message: "Failed to fetch support count" });
    }

    res.status(200).json({ support_count: results[0].support_count });
  });
});

app.get("/get-job-count", (req, res) => {

  const query = "SELECT COUNT(*) AS job_count FROM jobs WHERE expired = 0";


  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching job count:", err);
      return res.status(500).json({ message: "Failed to fetch job count" });
    }

    res.status(200).json({ job_count: results[0].job_count });
  });
});

app.get("/completed-coding-questions", (req, res) => {
  const { batch_id } = req.query;

  if (!batch_id) {
      return res.status(400).json({ message: "batch_id is required" });
  }

  const query = `
      SELECT 
          IFNULL(SUM(CASE WHEN c.level = 'easy' THEN 1 ELSE 0 END), 0) AS easy_completed,
          IFNULL(SUM(CASE WHEN c.level = 'medium' THEN 1 ELSE 0 END), 0) AS medium_completed,
          IFNULL(SUM(CASE WHEN c.level = 'hard' THEN 1 ELSE 0 END), 0) AS hard_completed
      FROM allocate_questions aq
      JOIN coding c ON aq.question_id = c.id
      WHERE aq.type = 'coding' 
      AND aq.batch_id = ?
      AND aq.completion_status = 1;
  `;

  db.query(query, [batch_id], (err, result) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Internal Server Error" });
      }

      res.status(200).json(result[0]); // Returning the count object
  });
});

app.get("/recent-announcements", (req, res) => {
  const { college_id, batch_id } = req.query;

  if (!college_id || !batch_id) {
      return res.status(400).json({ message: "college_id and batch_id are required" });
  }

  const query = `
      SELECT title, created_at 
      FROM announcements
      WHERE college_id = ? AND batch_id = ?
      ORDER BY created_at DESC
      LIMIT 3;
  `;

  db.query(query, [college_id, batch_id], (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Internal Server Error" });
      }

      res.status(200).json(results);
  });
});




app.get('/get-support', (req, res) => {
  const { student_id, b_id, c_id } = req.query;

  if (!student_id || !b_id || !c_id) {
      return res.status(400).json({ error: "Missing required parameters" });
  }

  const query = "SELECT * FROM student_support WHERE student_id = ? AND b_id = ? AND c_id = ?";

  db.query(query, [student_id, b_id, c_id], (err, results) => {
      if (err) {
          return res.status(500).json({ error: "Database error", details: err });
      }
      res.json(results);
  });
});

app.get('/get-all-support', (req, res) => {
  const query = `
    SELECT ss.id as ticket_id,s.name,c.collegeName,b.batchName,s.mail,s.phone,s.registerNumber,ss.category,
    ss.description,ss.status,ss.created_at
    FROM student_support ss
    JOIN students s ON ss.student_id = s.id
    JOIN colleges c ON ss.c_id = c.id
    JOIN batches b ON ss.b_id = b.id
    ORDER BY ss.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching support tickets:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.json(results);
  });
});

app.get('/get-placements', (req, res) => {
  const query = `
    SELECT *
    FROM placements
    ORDER BY created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching placements:', err);
      return res.status(500).json({ error: 'Database query error' });
    }
    res.json(results);
  });
});

// API to get total count of all tables
app.get("/get-totals", (req, res) => {
  const queries = {
    colleges: "SELECT COUNT(*) AS total_colleges FROM colleges",
    students: "SELECT COUNT(*) AS total_students FROM students",
    courses: "SELECT COUNT(*) AS total_courses FROM courses",
    mentors: "SELECT COUNT(*) AS total_mentors FROM mentors",
    jobs: "SELECT COUNT(*) AS total_jobs FROM jobs",
    testimonials: "SELECT COUNT(*) AS total_testimonials FROM testimonial",
  };

  let results = {};
  let completedQueries = 0;
  let totalQueries = Object.keys(queries).length;

  for (const key in queries) {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error("Error fetching count for " + key, err);
        results[key] = { error: "Error fetching data" };
      } else {
        results[key] = result[0];
      }
      completedQueries++;

      // Send response when all queries are completed
      if (completedQueries === totalQueries) {
        res.json(results);
      }
    });
  }
});


// API to get total count of pending mocks, coming soon mentors, and pending support requests
app.get("/get-status-counts", (req, res) => {
  const queries = {
    pendingMocks: "SELECT COUNT(*) AS total_pending_mocks FROM mock WHERE status = 'pending'",
    BookedMentors: "SELECT COUNT(*) AS total_Booked_Mentors FROM booked_mentors WHERE status = 'Coming Soon'",
    pendingSupport: "SELECT COUNT(*) AS total_pending_support FROM student_support WHERE status = 'Pending'"
  };

  let results = {};
  let completedQueries = 0;
  let totalQueries = Object.keys(queries).length;

  for (const key in queries) {
    db.query(queries[key], (err, result) => {
      if (err) {
        console.error("Error fetching count for " + key, err);
        results[key] = { error: "Error fetching data" };
      } else {
        results[key] = result[0];
      }
      completedQueries++;

      // Send response when all queries are completed
      if (completedQueries === totalQueries) {
        res.json(results);
      }
    });
  }
});



//-----------------------------------------------------------------------------------//

//All Post methods

const storage = multer.diskStorage({
    destination: 'uploads/', // specify upload folder
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // file name with timestamp
    }
});
const upload = multer({ storage });    
app.post("/api/colleges", upload.single("collegeLogo"), (req, res) => {
    const { collegeName, collegeDistrict, collegeMail, inChargeName, inChargePhone } = req.body;
    const collegeLogo = req.file ? `/uploads/${req.file.filename}` : null;
  
    if (!collegeName || !collegeDistrict || !collegeMail || !inChargeName || !inChargePhone || !collegeLogo) {
      return res.status(400).json({ message: "All fields are required!" });
    }
  
    const sql = "INSERT INTO colleges (collegeName, collegeLogo, collegeDistrict, collegeMail, inChargeName, inChargePhone) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [collegeName, collegeLogo, collegeDistrict, collegeMail, inChargeName, inChargePhone], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error!" });
      }
      res.status(201).json({ message: "College added successfully!" });
    });
  });

app.post('/api/testimonial', upload.fields([{ name: 'image' }, { name: 'companyLogo' }]), (req, res) => {
    // Extract form data and uploaded files
    const { name, company, review, rating } = req.body;
    const image = req.files['image'] ? req.files['image'][0].filename : null; // Image file
    const companyLogo = req.files['companyLogo'] ? req.files['companyLogo'][0].filename : null; // Company logo

    // SQL query to insert data into the testimonial table
    const sql = 'INSERT INTO testimonial (name, company, review, image, companyLogo, rating) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, company, review, image, companyLogo, rating], (err, result) => {
        if (err) {
            console.error('Error inserting testimonial:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json({ message: 'Testimonial added successfully' });
    });
});

app.post('/api/mentors', upload.fields([{ name: 'companyLogo' }, { name: 'photo' }]), (req, res) => {
  const { name, role, company, experience, email, phone, location, aboutMentor } = req.body;
  const companyLogo = req.files['companyLogo'] ? req.files['companyLogo'][0].filename : null;
  const photo = req.files['photo'] ? req.files['photo'][0].filename : null;

  const sql = `
    INSERT INTO mentors (name, role, company, companyLogo, experience, photo, email, phone, location, aboutMentor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, role, company, companyLogo, experience, photo, email, phone, location, aboutMentor],
    (err, result) => {
      if (err) {
        console.error('Error inserting mentor:', err);
        return res.status(500).json({ success: false, message: 'Failed to add mentor' });
      }
      res.status(200).json({ success: true, message: 'Mentor added successfully' });
    }
  );
});

app.post("/students", (req, res) => {
    console.log("Received data:", req.body);
    const students = Array.isArray(req.body) ? req.body : [req.body]; // Handle both single & bulk insert

    const sql = "INSERT INTO students (name, mail, phone, registerNumber, department, passedOutYear, b_id, c_id) VALUES ?";
    
    const values = students.map(student => [
        student.name,
        student.mail,
        student.phone,
        student.registerNumber,
        student.department,
        student.passedOutYear,
        student.b_id,
        student.c_id
    ]);

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error("Error inserting studentData:", err);
            return res.status(500).json({ error: "Failed to create Students" });
        }
        res.status(201).json({ message: `${result.affectedRows} Students Added successfully!` });
    });
});

app.post("/batches", (req, res) => {
    const { batchName, c_id } = req.body;
  
    if (!batchName || !c_id) {
      return res.status(400).json({ error: "Batch Name and College ID are required!" });
    }
  
    const sql = "INSERT INTO batches (batchName, c_id) VALUES (?, ?)";
    db.query(sql, [batchName, c_id], (err, result) => {
      if (err) {
        console.error("Error inserting batch:", err);
        return res.status(500).json({ error: "Failed to create batch" });
      }
      res.status(201).json({ message: "Batch created successfully!", batchId: result.insertId });
    });
});


app.post("/trainers", upload.single("resume_path"), (req, res) => {
  try {
    const { name, email, password, phone, b_id, c_id, type, core } = req.body;
    const resume_path = req.file ? req.file.filename : null;

    if (!name || !email || !password || !phone || !b_id || !c_id || !type || !core || !resume_path) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
     // Check if email already exists
    db.query(`SELECT * FROM trainers WHERE email = ?`, [email], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (results.length > 0) {
        return res.status(400).json({ error: "Email already exists. Please use a different email." });
      }
      // Insert into DB if email is unique
      db.query(
        `INSERT INTO trainers (name, email, password, phone, b_id, c_id, type, core, resume_path) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, password, phone, b_id, c_id, type, core, resume_path],
        (err) => {
          if (err) {
            console.error("Error inserting trainer:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res.status(201).json({ message: "Trainer added successfully." });
        }
      );
    });

  } catch (error) {
    console.error("Error creating trainer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/add-course', (req, res) => {
  const { courseName } = req.body;
  if (!courseName) return res.status(400).json({ message: 'Course name is required' });

  const checkQuery = 'SELECT * FROM courses WHERE course_name = ?';
  db.query(checkQuery, [courseName], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length > 0) return res.status(400).json({ message: 'Course name already exists' });

    const insertQuery = 'INSERT INTO courses (course_name) VALUES (?)';
    db.query(insertQuery, [courseName], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      return res.status(201).json({ message: 'Course added successfully', courseId: result.insertId });
    });
  });
});

app.post("/add-module", (req, res) => {
  const { course_id, module_name } = req.body;
  if (!course_id || !module_name.trim()) {
    return res.status(400).json({ error: "Course ID and module name are required" });
  }

  const query = "INSERT INTO modules (course_id, module_name) VALUES (?, ?)";
  db.query(query, [course_id, module_name], (err, result) => {
    if (err) {
      console.error("Error adding module:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ id: result.insertId, course_id, module_name });
  });
});

app.post("/topics", (req, res) => {
  const { module_id, topic_name } = req.body;
  if (!module_id || !topic_name) {
    return res.status(400).json({ error: "Module ID and Topic Name are required" });
  }

  db.query(
    "INSERT INTO topics (module_id, topic_name) VALUES (?, ?)",
    [module_id, topic_name],
    (error, results) => {
      if (error) {
        return res.status(500).json({ error: "Error adding topic" });
      }
      res.json({ message: "Topic added successfully", id: results.insertId });
    }
  );
});

app.post('/add-mcq', (req, res) => {
  const { topic_id, question, option1, option2, option3, option4, correct_answer } = req.body;

  const query = `
    INSERT INTO mcq (topic_id, question, option1, option2, option3, option4, correct_answer)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [topic_id, question, option1, option2, option3, option4, correct_answer], (err, result) => {
    if (err) {
      console.error('Error adding MCQ question:', err);
      return res.status(500).json({ message: 'Failed to add MCQ question' });
    }
    res.status(200).json({ message: 'MCQ question added successfully', id: result.insertId });
  });
});

app.post('/add-coding', (req, res) => {
  const { topic_id, title, question, level, platform_source, platform_link, youtube_links } = req.body;

  const query = `
    INSERT INTO coding (topic_id, title, question, level, platform_source, platform_link, youtube_links)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [topic_id, title, question, level, platform_source, platform_link, JSON.stringify(youtube_links)], (err, result) => {
    if (err) {
      console.error('Error adding coding question:', err);
      return res.status(500).json({ message: 'Failed to add coding question' });
    }
    res.status(200).json({ message: 'Coding question added successfully', id: result.insertId });
  });
});

app.post('/api/jobs', upload.single('company_logo'), (req, res) => {
  const { title, company, location, salary, skills, qualification, link } = req.body;
  const company_logo = req.file ? `/uploads/${req.file.filename}` : null;

  // Validate required fields
  if (!title || !company || !location || !skills || !qualification || !company_logo || !link) {
    return res.status(400).json({ message: 'All fields are required!' });
  }

  // Insert job into the database
  const query = `
    INSERT INTO jobs (title, company, company_logo, location, salary, skills, qualification, link, expired)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    query,
    [title, company, company_logo, location, salary, skills, qualification, link, 0], // Use 0 instead of 'false'
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error!' });
      }
      res.status(201).json({ message: 'Job added successfully!', id: result.insertId });
    }
  );
});

app.post("/allocate-courses", (req, res) => {
  const { batch_id, courses } = req.body;

  if (!batch_id || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: "Batch ID and courses are required." });
  }

  const values = courses.map((course_id) => [batch_id, course_id]);

  // Remove old allocations before inserting new ones
  db.query("DELETE FROM allocate_courses WHERE batch_id = ?", [batch_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Insert new allocations
    db.query("INSERT INTO allocate_courses (batch_id, course_id) VALUES ?", [values], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Courses allocated successfully!", affectedRows: result.affectedRows });
    });
  });
});

// app.post("/question-allocation", (req, res) => {
//   // Expecting req.body to be an array of allocation objects:
//   // [{ batch_id, topic_id, question_id, type, allocation_type }, ... ]
//   const allocations = req.body;

//   if (!Array.isArray(allocations) || allocations.length === 0) {
//     return res.status(400).json({ error: "Allocation data is required." });
//   }

//   // Assuming all allocation objects have the same batch_id, topic_id, and type
//   const { batch_id, topic_id, type } = allocations[0];
//   if (!batch_id || !topic_id || !type) {
//     return res.status(400).json({ error: "Batch ID, Topic ID, and Type are required." });
//   }

//   // Delete old allocations for this batch, topic, and type before inserting new ones
//   db.query(
//     "DELETE FROM allocate_questions WHERE batch_id = ? AND topic_id = ? AND type = ?",
//     [batch_id, topic_id, type],
//     (err) => {
//       if (err) return res.status(500).json({ error: err.message });

//       // Prepare values for bulk insertion
//       const values = allocations.map(({ batch_id, course_id, module_id, topic_id, question_id, type, allocation_type,completion_status }) => [
//         batch_id,
//         course_id,
//         module_id,
//         topic_id,
//         question_id,
//         type,
//         allocation_type,
//         completion_status,
//       ]);

//       // Insert new allocations in bulk
//       db.query(
//         "INSERT INTO allocate_questions (batch_id, course_id, module_id, topic_id, question_id, type, allocation_type,completion_status) VALUES ?",
//         [values],
//         (err, result) => {
//           if (err) return res.status(500).json({ error: err.message });
//           res.json({ message: "Allocations saved successfully!", affectedRows: result.affectedRows });
//         }
//       );
//     }
//   );
// });


app.post("/question-allocation", (req, res) => {
  // Expecting req.body to be an array of allocation objects:
  // [{ batch_id, topic_id, question_id, type, allocation_type, completion_status, module_id, course_id }, ... ]
  const allocations = req.body;

  if (!Array.isArray(allocations)) {
    return res.status(400).json({ error: "Allocation data must be an array." });
  }

  // Filter allocations to include only those with allocation_type = 'assignment' or 'additional'
  const validAllocations = allocations.filter(
    (alloc) => alloc.allocation_type === "assignment" || alloc.allocation_type === "additional"
  );

  // Assuming all allocation objects have the same batch_id, topic_id, and type
  const { batch_id, topic_id, type } = allocations[0] || {};
  if (!batch_id || !topic_id || !type) {
    return res.status(400).json({ error: "Batch ID, Topic ID, and Type are required." });
  }

  // Delete old allocations for this batch, topic, and type
  db.query(
    "DELETE FROM allocate_questions WHERE batch_id = ? AND topic_id = ? AND type = ?",
    [batch_id, topic_id, type],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // If there are no valid allocations, just return success after deletion
      if (validAllocations.length === 0) {
        return res.json({ message: "Previous allocations deleted successfully. No new allocations to insert." });
      }

      // Prepare values for bulk insertion (only valid allocations)
      const values = validAllocations.map(
        ({ batch_id, course_id, module_id, topic_id, question_id, type, allocation_type, completion_status }) => [
          batch_id,
          course_id,
          module_id,
          topic_id,
          question_id,
          type,
          allocation_type,
          completion_status,
        ]
      );

      // Insert new allocations in bulk
      db.query(
        "INSERT INTO allocate_questions (batch_id, course_id, module_id, topic_id, question_id, type, allocation_type, completion_status) VALUES ?",
        [values],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "Allocations saved successfully!", affectedRows: result.affectedRows });
        }
      );
    }
  );
});




app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  // Query the database for the username
  const query = 'SELECT * FROM admin_login WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length > 0) {
      // Compare the entered password with the hashed password stored in the database
      bcrypt.compare(password, results[0].password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (isMatch) {
          // Passwords match, generate a JWT token with an expiration time
          const payload = { username: results[0].username }; // Store essential user data
          const token = jwt.sign(payload, 'your-secret-key', { expiresIn: '1m' }); // Token expires in 1 minute

          return res.json({ success: true, token });
        } else {
          // Invalid password
          return res.status(400).json({ success: false, message: 'Invalid username or password' });
        }
      });
    } else {
      // User not found
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }
  });
});

// app.post('/api/trainer-login', (req, res) => {
//   const { username, password } = req.body;
//   const query = 'SELECT * FROM trainers WHERE email = ? AND password = ?';

//   db.query(query, [username, password], (err, results) => {
//       if (err) {
//           return res.status(500).json({ error: 'Database error' });
//       }
//       if (results.length > 0) {
//           res.json({ success: true, message: 'Login successful',trainer:results[0] });
//       } else {
//           res.status(401).json({ success: false, message: 'Invalid credentials' });
//       }
//   });
// });

// POST endpoint to create a new announcement



app.post('/api/trainer-login', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  // Query to fetch trainer details
  const query = 'SELECT * FROM trainers WHERE email = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Database error in trainer query:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const trainer = results[0]; // Contains all trainer fields
    const sessionToken = generateToken();

    // Check if a session already exists for this trainer
    const checkSessionQuery = 'SELECT * FROM trainer_sessions WHERE trainer_id = ?';
    db.query(checkSessionQuery, [trainer.id], (err, sessionResults) => {
      if (err) {
        console.error('Database error in session check:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }

      if (sessionResults.length > 0) {
        // Remove old session before logging in
        const deleteSessionQuery = 'DELETE FROM trainer_sessions WHERE trainer_id = ?';
        db.query(deleteSessionQuery, [trainer.id], (err) => {
          if (err) {
            console.error('Database error in session deletion:', err);
            return res.status(500).json({ success: false, message: 'DB error' });
          }

          // Proceed to insert the new session
          insertTrainerSession(trainer.id, sessionToken, res, trainer);
        });
      } else {
        // No existing session, proceed to insert the new session
        insertTrainerSession(trainer.id, sessionToken, res, trainer);
      }
    });
  });
});

// Helper function to insert a new trainer session
const insertTrainerSession = (trainerId, sessionToken, res, trainer) => {
  const insertSessionQuery = 'INSERT INTO trainer_sessions (trainer_id, session_token) VALUES (?, ?)';
  db.query(insertSessionQuery, [trainerId, sessionToken], (err) => {
    if (err) {
      console.error('Database error in session insertion:', err);
      return res.status(500).json({ success: false, message: 'DB error' });
    }

    // Attach token to trainer data and send full trainer details
    trainer.token = sessionToken;
    res.json({ success: true, message: 'Login successful', trainer });
  });
};

// Helper function to insert a new session
const insertSession = (userId, sessionToken, res, trainer) => {
  const insertSessionQuery = 'INSERT INTO active_sessions (user_id, session_token) VALUES (?, ?)';
  db.query(insertSessionQuery, [userId, sessionToken], (err) => {
    if (err) {
      console.error('Database error in session insertion:', err);
      return res.status(500).json({ success: false, message: 'DB error' });
    }

    // Attach token to trainer data and send full trainer details
    trainer.token = sessionToken;
    res.json({ success: true, message: 'Login successful', trainer });
  });
};

app.post('/api/verify-trainer-session', (req, res) => {
  const { token, userId } = req.body;

  // Query to check if the session exists in trainer_sessions
  const query = `
    SELECT * FROM trainer_sessions 
    WHERE trainer_id = ? AND session_token = ?
  `;
  db.query(query, [userId, token], (err, results) => {
    if (err) {
      console.error('Database error in session verification:', err);
      return res.status(500).json({ valid: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.json({ valid: false, message: 'Invalid session' });
    }

    // Session is valid
    res.json({ valid: true });
  });
});


app.post('/announcements', (req, res) => {
  const { title, description, batch_id, college_id } = req.body;

  if (!title || !description || !batch_id || !college_id) {
    return res.status(400).json({ error: "Title, Description, Batch ID, and College ID are required!" });
  }

  const sql = "INSERT INTO announcements (title, description, batch_id, college_id) VALUES (?, ?, ?, ?)";
  db.query(sql, [title, description, batch_id, college_id], (err, result) => {
    if (err) {
      console.error("Error inserting announcement:", err);
      return res.status(500).json({ error: "Failed to post announcement" });
    }
    res.status(201).json({ message: "Announcement posted successfully!", announcementId: result.insertId });
  });
});


app.post("/upload-notes", upload.single("file"), async (req, res) => {
  const { course_id, module_id, topic_id, title, c_id, b_id } = req.body;
  const file = req.file;

  if (!course_id || !module_id || !topic_id || !title || !file || !c_id || !b_id) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const filePath = file.path; // Path where the file is saved

  const query = `
    INSERT INTO upload_notes (course_id, module_id, topic_id, title, file_path, created_at, c_id, b_id)
    VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
  `;

  db.query(
    query,
    [course_id, module_id, topic_id, title, filePath, c_id, b_id],
    (err, result) => {
      if (err) {
        console.error("Error inserting data into MySQL:", err);
        return res.status(500).json({ error: "Failed to upload notes." });
      }

      res.status(200).json({ message: "Notes uploaded successfully!" });
    }
  );
});

app.get("/notes/:topicId", async (req, res) => {
  const { topicId } = req.params;
  const { c_id, b_id } = req.query; // Extract c_id and b_id from query params

  if (!c_id || !b_id) {
    return res.status(400).json({ error: "c_id and b_id are required." });
  }

  const query = `
    SELECT id, title, file_path, created_at
    FROM upload_notes
    WHERE topic_id = ? AND c_id = ? AND b_id = ?
  `;

  db.query(query, [topicId, c_id, b_id], (err, results) => {
    if (err) {
      console.error("Error fetching notes:", err);
      return res.status(500).json({ error: "Failed to fetch notes." });
    }

    res.status(200).json(results);
  });
});

app.post("/api/update-completion-status", (req, res) => {
  const { allocation_id, completion_status } = req.body;

  const query = `
    UPDATE allocate_questions
    SET completion_status = ?
    WHERE id = ?
  `;

  db.query(query, [completion_status, allocation_id], (err, results) => {
    if (err) {
      console.error("Error updating completion status:", err);
      return res.status(500).json({ error: "Failed to update completion status" });
    }

    res.status(200).json({ success: true });
  });
});



app.post('/api/book-mentor', async (req, res) => {
  const { student_id, mentor_id, reason, focus_on } = req.body;

  // Validate required fields
  if (!student_id || !mentor_id || !reason || !focus_on) {
      return res.status(400).json({ success: false, message: 'All fields are required!' });
  }

  const query = `
      INSERT INTO booked_mentors (student_id, mentor_id, reason, focus_on, created_at)
      VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(query, [student_id, mentor_id, reason, focus_on], (err, results) => {
      if (err) {
          console.error('Error booking mentor:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      res.json({ success: true, booking: results });
  });
});



app.post("/api/update-booking", (req, res) => {
  const { mentor_id, student_id, created_at, status, status_result } = req.body;

  // Validate required fields
  if (!mentor_id || !student_id || !created_at || !status || !status_result) {
    return res.status(400).json({ success: false, message: "All fields are required!" });
  }

  const query = `
    UPDATE booked_mentors
    SET status = ?, status_result = ?
    WHERE mentor_id = ? AND student_id = ? AND created_at = ?
  `;

  db.query(query, [status, status_result, mentor_id, student_id, created_at], (err, results) => {
    if (err) {
      console.error("Error updating booking:", err);
      return res.status(500).json({ success: false, message: "Failed to update booking" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "No booking found to update" });
    }

    res.status(200).json({ success: true, message: "Booking updated successfully" });
  });
});

// Bulk update bookings
app.post("/api/update-bulk-booking", (req, res) => {
  const { mentor_id, student_ids, created_ats, status, status_result } = req.body;

  // Validate required fields
  if (!mentor_id || !student_ids || !created_ats || !status || !status_result) {
    return res.status(400).json({ success: false, message: "All fields are required!" });
  }

  if (student_ids.length !== created_ats.length) {
    return res.status(400).json({ success: false, message: "student_ids and created_ats must have the same length" });
  }

  const query = `
    UPDATE booked_mentors
    SET status = ?, status_result = ?
    WHERE mentor_id = ? AND student_id = ? AND created_at = ?
  `;

  let updateCount = 0; // Track how many records were updated

  // Loop through each student and update their record
  student_ids.forEach((student_id, index) => {
    const created_at = created_ats[index];

    db.query(query, [status, status_result, mentor_id, student_id, created_at], (err, results) => {
      if (err) {
        console.error("Error updating booking:", err);
        return res.status(500).json({ success: false, message: "Failed to perform bulk update" });
      }

      updateCount += results.affectedRows; // Increment the count of updated records

      // If this is the last update, send the response
      if (index === student_ids.length - 1) {
        if (updateCount === 0) {
          return res.status(404).json({ success: false, message: "No bookings found to update" });
        }

        res.status(200).json({ success: true, message: `Bulk update successful. Updated ${updateCount} records.` });
      }
    });
  });
});


// POST endpoint to create a new mock booking
app.post('/mock-bookings', (req, res) => {
  const { student_id, course_id, prefer_date1, prefer_date2, prefer_date3, status, status_result, booked_at } = req.body;

  // Log the request payload
  console.log("Request payload:", req.body);

  // Validate required fields
  if (!student_id || !course_id || !prefer_date1 || !prefer_date2 || !prefer_date3) {
    console.error("Missing required fields:", req.body);
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `
    INSERT INTO mock (student_id, course_id, prefer_date1, prefer_date2, prefer_date3, status, status_result, booked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [student_id, course_id, prefer_date1, prefer_date2, prefer_date3, status || 'pending', status_result || 'pending', booked_at || new Date().toISOString()];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Database error:", err); // Log the database error
      return res.status(500).json({ error: "Failed to create mock booking" });
    }

    res.json({ message: "Mock booking created successfully", bookingId: results.insertId });
  });
});


// Save Notes Endpoint
app.post("/api/student-coding-notes", (req, res) => {
  const { student_id, question_id, notes } = req.body;

  if (!student_id || !question_id || !notes) {
    return res.status(400).json({ error: "student_id, question_id, and notes are required" });
  }

  const query = `
    INSERT INTO student_coding_notes (student_id, question_id, notes)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE notes = ?
  `;

  db.query(query, [student_id, question_id, notes, notes], (err, results) => {
    if (err) {
      console.error("Error saving notes:", err);
      return res.status(500).json({ error: "Failed to save notes" });
    }

    res.json({ message: "Notes saved successfully" });
  });
});


app.post("/submit-support", (req, res) => {
  const { student_id, c_id, b_id, category, description, status } = req.body;

  if (!student_id || !c_id || !b_id || !category || !description) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `INSERT INTO student_support (student_id, c_id, b_id, category, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`;

  db.query(query, [student_id, c_id, b_id, category, description, status], (err, result) => {
    if (err) {
      console.error("Error inserting support request:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(200).json({ message: "Support request submitted successfully" });
  });
});


app.post("/update-support-ticket", (req, res) => {
  const { ticket_id, status, description } = req.body;

  const query = "UPDATE student_support SET status = ?, description = ? WHERE id = ?";
  const values = [status, description, ticket_id];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error("Error updating ticket:", error);
      return res.status(500).json({ message: "Failed to update ticket" });
    }
    res.status(200).json({ message: "Ticket updated successfully" });
  });
});


// POST API to Add Placement
app.post("/add-placement", upload.single("photo"), (req, res) => {
  const { name, batchName, department, passedOutYear, company, lpa } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  // Check for missing fields
  if (!name || !batchName || !department || !passedOutYear || !company || !lpa || !photo) {
    return res.status(400).json({ message: "❌ All fields are required!" });
  }

  // Insert into MySQL
  const sql = `INSERT INTO placements (name, photo, batchName, department, passedOutYear, company, lpa) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, photo, batchName, department, passedOutYear, company, lpa], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ message: "❌ Database error!" });
    }
    res.status(201).json({ message: "✅ Placement added successfully!", placementId: result.insertId });
  });
});


// app.post('/api/student-login', (req, res) => {
//   const { username, password } = req.body;
//   const query = 'SELECT * FROM students WHERE mail = ? AND registerNumber = ?';

//   db.query(query, [username, password], (err, results) => {
//       if (err) {
//           return res.status(500).json({ error: 'Database error' });
//       }
//       if (results.length > 0) {
//           res.json({ success: true, message: 'Login successful',student:results[0] });
//       } else {
//           res.status(401).json({ success: false, message: 'Invalid credentials' });
//       }
//   });
// });

app.post("/api/student-login", (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM students WHERE mail = ? AND registerNumber = ?";

  db.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const student = results[0]; // Contains all student fields
    const sessionToken = generateToken();

    // Check if a session already exists for this student
    const checkSessionQuery = "SELECT * FROM active_sessions WHERE user_id = ?";
    db.query(checkSessionQuery, [student.id], (err, sessionResults) => {
      if (err) return res.status(500).json({ success: false, message: "DB error" });

      if (sessionResults.length > 0) {
        // Remove old session before logging in
        const deleteSessionQuery = "DELETE FROM active_sessions WHERE user_id = ?";
        db.query(deleteSessionQuery, [student.id], (err) => {
          if (err) return res.status(500).json({ success: false, message: "DB error" });
        });
      }

      // Store the new session
      const insertSessionQuery = "INSERT INTO active_sessions (user_id, session_token) VALUES (?, ?)";
      db.query(insertSessionQuery, [student.id, sessionToken], (err) => {
        if (err) return res.status(500).json({ success: false, message: "DB error" });

        // Attach token to student data and send full student details
        student.token = sessionToken;
        res.json({ success: true, message: "Login successful", student });
      });
    });
  });
});

app.post("/api/verify-session", (req, res) => {
  const { token, userId } = req.body;

  const query = "SELECT * FROM active_sessions WHERE user_id = ? AND session_token = ?";
  db.query(query, [userId, token], (err, results) => {
    if (err) return res.status(500).json({ valid: false, message: "Database error" });

    if (results.length > 0) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false, message: "Session expired or invalid" });
    }
  });
});

app.get("/leetcode/:username", async (req, res) => {
  const { username } = req.params; // Get username from URL

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    console.log("Fetching LeetCode data for:", username);

    const response = await axios.post("https://leetcode.com/graphql", {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `,
      variables: { username },
    });

    console.log("LeetCode API Response:", response.data);

    res.json(response.data.data.matchedUser.submitStats.acSubmissionNum);
  } catch (error) {
    console.error("LeetCode API Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch data from LeetCode" });
  }
});


// Enhanced count extraction with multiple fallbacks
app.get("/geeksforgeeks", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // First try the original API
    try {
      const apiResponse = await axios.get(`https://geeks-for-geeks-api.vercel.app/${username}`, {
        timeout: 3000 // 3 second timeout
      });
      
      // Validate API response
      if (apiResponse.data && apiResponse.data.solvedStats) {
        return res.json(apiResponse.data);
      }
    } catch (apiError) {
      console.log("API failed, falling back to scraping:", apiError.message);
    }

    // Proceed with scraping if API failed
    const url = `https://auth.geeksforgeeks.org/user/${username}/practice/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // 1. Extract total problems from JSON-LD
    let totalProblems = 0;
    try {
      const jsonLd = $('script[type="application/ld+json"]').html();
      if (jsonLd) {
        const jsonData = JSON.parse(jsonLd);
        totalProblems = parseInt(jsonData.total_problems_solved) || 0;
      }
    } catch (e) {
      console.log("Couldn't parse JSON-LD:", e.message);
    }

    // 2. Extract from problem navbar (fallback)
    const extractNavbarCount = (difficulty) => {
      const element = $(`.problemNavbar_head_nav--text__UaGCx:contains("${difficulty}")`);
      if (element.length) {
        const text = element.text();
        const match = text.match(/\((\d+)\)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    };

    const basicCount = extractNavbarCount('BASIC');
    const easyCount = extractNavbarCount('EASY');
    const mediumCount = extractNavbarCount('MEDIUM');
    const hardCount = extractNavbarCount('HARD');

    // Calculate total if not found in JSON-LD
    if (totalProblems === 0) {
      totalProblems = basicCount + easyCount + mediumCount + hardCount;
    }

    // Verify we got valid data
    if (totalProblems === 0 && basicCount === 0 && easyCount === 0) {
      return res.status(404).json({ error: "Profile data not found" });
    }

    // Return in the expected format
    res.json({
      solvedStats: {
        total: totalProblems,
        basic: { count: basicCount },
        easy: { count: easyCount },
        medium: { count: mediumCount },
        hard: { count: hardCount }
      }
    });

  } catch (error) {
    console.error("Error fetching GFG stats:", error);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: "Profile Not Found" });
    }
    
    res.status(500).json({ 
      error: "Failed to fetch GeeksforGeeks stats",
      details: error.message 
    });
  }
});



// app.post("/leetcode", async (req, res) => {
//   const { username } = req.body;

//   if (!username) {
//     return res.status(400).json({ error: "Username is required" });
//   }

//   try {
//     console.log("Fetching LeetCode data for:", username);

//     const response = await axios.post("https://leetcode.com/graphql", {
//       query: `
//         query getUserProfile($username: String!) {
//           matchedUser(username: $username) {
//             username
//             submitStats: submitStatsGlobal {
//               acSubmissionNum {
//                 difficulty
//                 count
//               }
//             }
//           }
//         }
//       `,
//       variables: { username },
//     });

//     console.log("LeetCode API Response:", response.data);

//     res.json(response.data.data.matchedUser.submitStats.acSubmissionNum);
//   } catch (error) {
//     console.error("LeetCode API Fetch Error:", error.response?.data || error.message);
//     res.status(500).json({ error: "Failed to fetch data from LeetCode" });
//   }
// });

// app.post("/geeksforgeeks", async (req, res) => {
//   const { username } = req.body;

//   if (!username) {
//     return res.status(400).json({ error: "Username is required" });
//   }

//   try {
//     const response = await axios.get(`https://geeks-for-geeks-api.vercel.app/${username}`);
//     res.json(response.data);
//   } catch (error) {
//     console.error("Error fetching GFG data:", error.message);
//     res.status(500).json({ error: "Failed to fetch GeeksforGeeks stats" });
//   }
// });



//----------------------------------------------------------------//
// All Put Methods




app.put('/colleges/:id', (req, res) => {
    const { id } = req.params;
    const { collegeName, collegeDistrict, collegeMail, inChargeName, inChargePhone, collegeLogo } = req.body;
    const query = 'UPDATE colleges SET collegeName = ?, collegeDistrict = ?, collegeMail = ?, inChargeName = ?, inChargePhone = ?, collegeLogo = ? WHERE id = ?';
  
    db.query(query, [collegeName, collegeDistrict, collegeMail, inChargeName, inChargePhone, collegeLogo, id], (err, result) => {
      if (err) {
        console.error('Error updating college:', err);
        return res.status(500).json({ message: 'Error updating college' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'College not found' });
      }
      res.json({ message: 'College updated successfully' });
    });
});


app.put("/batches/id/:batchId", (req, res) => {
    const { batchId } = req.params;
    const { batchName } = req.body; // New batch name from request body
  
    // Validate input (optional)
    if (!batchName) {
      return res.status(400).json({ error: "Batch name is required" });
    }
  
    db.query(
      "UPDATE batches SET batchName = ? WHERE id = ?",
      [batchName, batchId],
      (err, result) => {
        if (err) {
          console.error("Error updating batch:", err);
          return res.status(500).json({ error: "Failed to update batch" });
        }
        if (result.affectedRows > 0) {
          res.json({ message: "Batch updated successfully!" });
        } else {
          res.status(404).json({ error: "Batch not found" });
        }
      }
    );
});

// Update Student Endpoint
app.put("/students/:id", (req, res) => {
    const studentId = req.params.id;
    const updatedStudent = req.body;
  
    // Validate required fields
    if (
      !updatedStudent.name ||
      !updatedStudent.mail ||
      !updatedStudent.phone ||
      !updatedStudent.registerNumber ||
      !updatedStudent.department ||
      !updatedStudent.passedOutYear
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
  
    const query = `
      UPDATE students 
      SET 
        name = ?, 
        mail = ?, 
        phone = ?, 
        registerNumber = ?, 
        department = ?, 
        passedOutYear = ?
      WHERE id = ?
    `;
  
    const values = [
      updatedStudent.name,
      updatedStudent.mail,
      updatedStudent.phone,
      updatedStudent.registerNumber,
      updatedStudent.department,
      updatedStudent.passedOutYear,
      studentId,
    ];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error updating student:", err);
        return res.status(500).json({ error: "Failed to update student" });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Student not found" });
      }
  
      res.status(200).json({ message: "Student updated successfully" });
    });
  });

  app.put("/trainers/:id", (req, res) => {
    const trainerId = req.params.id;
    const { name, email, password, phone, type, core } = req.body;
  
    if (!name || !email || !password || !phone || !type || !core) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
    // Check if the email is already used by another trainer (excluding the current trainer)
    db.query(
      `SELECT * FROM trainers WHERE email = ? AND id != ?`,
      [email, trainerId],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
  
        if (results.length > 0) {
          return res.status(400).json({ error: "Email already exists. Please use a different email." });
        }
  
        // Update only specific fields
        db.query(
          `UPDATE trainers SET name=?, email=?, password=?, phone=?, type=?, core=? WHERE id=?`,
          [name, email, password, phone, type, core, trainerId],
          (err, result) => {
            if (err) {
              console.error("Error updating trainer:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            }
  
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: "Trainer not found." });
            }
  
            res.status(200).json({ message: "Trainer updated successfully." });
          }
        );
      }
    );
  });

  app.put('/edit-course/:id', (req, res) => {
    const { id } = req.params;
    const { courseName } = req.body;
  
    if (!courseName) return res.status(400).json({ message: 'Course name is required' });
  
    // Check if course name already exists
    const checkQuery = 'SELECT * FROM courses WHERE course_name = ? AND id != ?';
    db.query(checkQuery, [courseName, id], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (results.length > 0) return res.status(400).json({ message: 'Course name already exists' });
  
      // Update course name
      const updateQuery = 'UPDATE courses SET course_name = ? WHERE id = ?';
      db.query(updateQuery, [courseName, id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        return res.status(200).json({ message: 'Course updated successfully' });
      });
    });
  });
  
  // 4️⃣ Edit a module
app.put("/edit-module/:moduleId", (req, res) => {
  const { moduleId } = req.params;
  const { module_name } = req.body;

  if (!module_name.trim()) {
    return res.status(400).json({ error: "Module name cannot be empty" });
  }

  const query = "UPDATE modules SET module_name = ? WHERE id = ?";
  db.query(query, [module_name, moduleId], (err, result) => {
    if (err) {
      console.error("Error updating module:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Module updated successfully" });
  });
});

app.put("/topics/:id", (req, res) => {
  const { id } = req.params;
  const { topic_name } = req.body;
  
  if (!topic_name) {
    return res.status(400).json({ error: "Topic Name is required" });
  }

  db.query(
    "UPDATE topics SET topic_name = ? WHERE id = ?",
    [topic_name, id],
    (error) => {
      if (error) {
        return res.status(500).json({ error: "Error updating topic" });
      }
      res.json({ message: "Topic updated successfully" });
    }
  );
});

app.put("/update-mcq", (req, res) => {
  const { id, topic_id, question, option1, option2, option3, option4, correct_answer } = req.body;
  
  db.query(
    `UPDATE mcq SET topic_id = ?, question = ?, option1 = ?, option2 = ?, option3 = ?, option4 = ?, correct_answer = ? WHERE id = ?`,
    [topic_id, question, option1, option2, option3, option4, correct_answer, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "MCQ updated successfully" });
    }
  );
});

app.put("/update-coding", (req, res) => {
  const { id, topic_id, title, question, level, platform_source, platform_link, youtube_links } = req.body;

  if (!id || !topic_id || !title || !question || !level) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log("Received Question Content:", question); // ✅ Debugging

  const finalPlatformLink = platform_source === "yes" ? platform_link : null;

  db.query(
    `UPDATE coding 
     SET topic_id = ?, title = ?, question = ?, level = ?, platform_source = ?, platform_link = ?, youtube_links = ? 
     WHERE id = ?`,
    [topic_id, title, question, level, platform_source, finalPlatformLink, youtube_links, id],
    (err, result) => {
      if (err) {
        console.error("Database Update Error:", err);
        return res.status(500).json({ error: "Database update failed" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "No record found with the given ID" });
      }

      res.json({ message: "Coding question updated successfully" });
    }
  );
});

app.put("/announcements/:id", (req, res) => {
  const { id } = req.params; // Get the announcement ID from the URL
  const { title, description } = req.body; // Get the updated title and description from the request body

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  // Define the update query
  const updateQuery = `
    UPDATE announcements
    SET title = ?, description = ?, updated_at = NOW()
    WHERE id = ?;
  `;
  const values = [title, description, id];

  // Execute the update query
  db.query(updateQuery, values, (error, results) => {
    if (error) {
      console.error("Error updating announcement:", error);
      return res.status(500).json({ error: "Failed to update announcement" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    // Retrieve the updated announcement
    const selectQuery = `
      SELECT * FROM announcements WHERE id = ?;
    `;
    db.query(selectQuery, [id], (selectError, selectResults) => {
      if (selectError) {
        console.error("Error fetching updated announcement:", selectError);
        return res.status(500).json({ error: "Failed to retrieve updated announcement" });
      }

      // Send the updated announcement as the response
      res.status(200).json(selectResults[0]);
    });
  });
});

// Update a job
app.put('/api/jobs/:id', upload.single('company_logo'), (req, res) => {
  const { id } = req.params;
  const { title, company, location, salary, skills, qualification, expired } = req.body;

  // Validate required fields
  if (!title || !company || !location || !salary || !skills || !qualification || !expired) {
    return res.status(400).json({ message: 'All fields are required!' });
  }

  const query = `
    UPDATE jobs
    SET title = ?, company = ?, location = ?, salary = ?, skills = ?, qualification = ?, expired = ?
    WHERE id = ?
  `;
  db.query(
    query,
    [title, company,location, salary, skills, qualification, expired, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error!' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Job not found!' });
      }
      res.status(200).json({ message: 'Job updated successfully!' });
    }
  );
});


// Update mentor by ID
app.put('/api/mentors/:id', upload.fields([{ name: 'companyLogo', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), (req, res) => {
  const mentorId = req.params.id;
  const { name, role, company, experience, email, phone, location, aboutMentor } = req.body;

  // Check if new files are uploaded
  const companyLogo = req.files['companyLogo'] ? req.files['companyLogo'][0].filename : null;
  const photo = req.files['photo'] ? req.files['photo'][0].filename : null;

  // Fetch the existing mentor data
  const fetchSql = 'SELECT companyLogo, photo FROM mentors WHERE id = ?';
  db.query(fetchSql, [mentorId], (err, results) => {
      if (err) {
          console.error('Error fetching mentor data:', err);
          return res.status(500).json({ success: false, message: 'Failed to fetch mentor data' });
      }

      const existingMentor = results[0];

      // Use existing photo and logo if no new files are uploaded
      const updatedCompanyLogo = companyLogo || existingMentor.companyLogo;
      const updatedPhoto = photo || existingMentor.photo;

      // Update the mentor in the database
      const updateSql = `
          UPDATE mentors 
          SET name = ?, role = ?, company = ?, companyLogo = ?, experience = ?, photo = ?, email = ?, phone = ?, location = ?, aboutMentor = ?
          WHERE id = ?
      `;

      db.query(
          updateSql,
          [name, role, company, updatedCompanyLogo, experience, updatedPhoto, email, phone, location, aboutMentor, mentorId],
          (err, result) => {
              if (err) {
                  console.error('Error updating mentor:', err);
                  return res.status(500).json({ success: false, message: 'Failed to update mentor' });
              }
              res.status(200).json({ success: true, message: 'Mentor updated successfully' });
          }
      );
  });
});


// Update mock booking endpoint
app.put("/mock-bookings/:id", upload.single("certificateFile"), (req, res) => {
  const { id } = req.params;
  const { status, statusResult } = req.body;
  const certificateFile = req.file;

  let updateQuery = "UPDATE mock SET status = ?, status_result = ?";
  const queryParams = [status, statusResult];

  // If a certificate file is uploaded, update the certificate field
  if (certificateFile) {
    updateQuery += ", certificate = ?";
    queryParams.push(certificateFile.filename);
  }

  updateQuery += " WHERE id = ?";
  queryParams.push(id);

  db.query(updateQuery, queryParams, (err, result) => {
    if (err) {
      console.error("Error updating record:", err);
      return res.status(500).json({ error: "Failed to update record" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({ message: "Record updated successfully" });
  });
});



app.put('/update-placement/:id', upload.single('photo'), (req, res) => {
  const { id } = req.params;
  const { name, batchName, department, passedOutYear, company, lpa } = req.body;

  // Check if a new photo is uploaded
  let photoUrl = null;
  if (req.file) {
    photoUrl = `/uploads/${req.file.filename}`; // New photo URL
  }

  // Build the SQL query
  let query = 'UPDATE placements SET name = ?, batchName = ?, department = ?, passedOutYear = ?, company = ?, lpa = ?';
  const params = [name, batchName, department, passedOutYear, company, lpa];

  // Append photo URL to the query if a new photo is uploaded
  if (photoUrl) {
    query += ', photo = ?';
    params.push(photoUrl);
  }

  query += ' WHERE id = ?';
  params.push(id);

  // Execute the query
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error updating placement:', err);
      return res.status(500).json({ error: 'Failed to update placement' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json({ message: 'Placement updated successfully' });
  });
});

// Update Testimonial Endpoint
app.put("/testimonial/:id", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
]), (req, res) => {
  const testimonialId = req.params.id;
  const { name, company, review, rating } = req.body;

  // Check if files were uploaded
  const image = req.files["image"] ? req.files["image"][0].filename : null;
  const companyLogo = req.files["companyLogo"] ? req.files["companyLogo"][0].filename : null;

  // Construct the SQL query dynamically based on provided fields
  let sql = "UPDATE testimonial SET ";
  const updates = [];
  const values = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (company) {
    updates.push("company = ?");
    values.push(company);
  }
  if (review) {
    updates.push("review = ?");
    values.push(review);
  }
  if (rating) {
    updates.push("rating = ?");
    values.push(rating);
  }
  if (image) {
    updates.push("image = ?");
    values.push(image);
  }
  if (companyLogo) {
    updates.push("companyLogo = ?");
    values.push(companyLogo);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields provided for update" });
  }

  sql += updates.join(", ") + " WHERE id = ?";
  values.push(testimonialId);

  // Execute the query
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating testimonial:", err);
      return res.status(500).json({ error: "Failed to update testimonial" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Testimonial not found" });
    }
    res.json({ message: "Testimonial updated successfully" });
  });
});

//-----------------------------------------------------------------//
//All Delete Methods

app.delete("/testimonial/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
    }
    
    const sql = 'DELETE FROM testimonial WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error Deleting testimonial:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json({ message: 'Testimonial Deleted successfully' });
    });
  });

app.delete("/Colleges/:id", (req, res) => {
    const { id } = req.params; // Get the college ID from the URL parameters
  
    const sqlQuery = "DELETE FROM colleges WHERE id = ?";
  
    db.query(sqlQuery, [id], (err, result) => {
      if (err) {
        console.error("Error deleting college:", err);
        return res.status(500).json({ message: "Database error" });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "College not found" });
      }
  
      res.status(200).json({ message: "College deleted successfully" });
    });
  });

   // ✅ **. Delete a Batch**
app.delete("/batches/id/:batchId", (req, res) => {
    const { batchId } = req.params;
    db.query("DELETE FROM batches WHERE id = ?", [batchId], (err, result) => {
      if (err) {
        console.error("Error deleting batch:", err);
        return res.status(500).json({ error: "Failed to delete batch" });
      }
      res.json({ message: "Batch deleted successfully!" });
    });
});

app.delete("/students/:id",(req,res)=>{
    const {id} =req.params;
    db.query("DELETE from students WHERE id=?",[id],(err,result)=>{
        if(err){
            console.error("Error deleting student:", err);
            return res.status(500).json({ error: "Failed to delete student" }); 
        }
        res.json({ message: "student deleted successfully!" });
    })
})

app.delete("/trainers/:id",(req,res)=>{
  const {id} =req.params;
  db.query("DELETE from trainers WHERE id=?",[id],(err,result)=>{
      if(err){
          console.error("Error deleting student:", err);
          return res.status(500).json({ error: "Failed to delete trainer" }); 
      }
      res.json({ message: "trainer deleted successfully!" });
  })
})

app.delete('/delete-course/:id', (req, res) => {
  const { id } = req.params;

  // Validate ID (must be a number)
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid course ID" });
  }

  const query = 'DELETE FROM courses WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to delete course" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ success: true, message: "Course deleted successfully" });
  });
});

// 5️⃣ Delete a module
app.delete("/delete-module/:moduleId", (req, res) => {
  const { moduleId } = req.params;

  const query = "DELETE FROM modules WHERE id = ?";
  db.query(query, [moduleId], (err, result) => {
    if (err) {
      console.error("Error deleting module:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Module deleted successfully" });
  });
});


app.delete("/topics/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM topics WHERE id = ?", [id], (error) => {
    if (error) {
      return res.status(500).json({ error: "Error deleting topic" });
    }
    res.json({ message: "Topic deleted successfully" });
  });
});

app.delete("/mcq/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM mcq WHERE id = ?", [id], (error) => {
    if (error) {
      return res.status(500).json({ error: "Error deleting topic" });
    }
    res.json({ message: "mcq deleted successfully" });
  });
});

app.delete("/coding/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM coding WHERE id = ?", [id], (error) => {
    if (error) {
      return res.status(500).json({ error: "Error deleting topic" });
    }
    res.json({ message: "coding deleted successfully" });
  });
});

// Delete a job
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM jobs WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error!' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found!' });
    }
    res.status(200).json({ message: 'Job deleted successfully!' });
  });
});

app.delete("/announcements/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM announcements WHERE id = ?";

  db.query(sql, [id], (error, result) => {
      if (error) {
          console.error("Error deleting announcement:", error);
          return res.status(500).json({ error: "Failed to delete announcement!" });
      }

      if (result.affectedRows > 0) {
          res.status(200).json({ message: "Announcement deleted successfully!" });
      } else {
          res.status(404).json({ error: "Announcement not found!" });
      }
  });
});

app.delete("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;

  const query = `
    DELETE FROM upload_notes
    WHERE id = ?
  `;

  db.query(query, [noteId], (err, result) => {
    if (err) {
      console.error("Error deleting note:", err);
      return res.status(500).json({ error: "Failed to delete note." });
    }

    res.status(200).json({ message: "Note deleted successfully!" });
  });
});

// Delete mentor by ID
app.delete('/api/mentors/:id', (req, res) => {
  const mentorId = req.params.id;

  const sql = 'DELETE FROM mentors WHERE id = ?';
  db.query(sql, [mentorId], (err, result) => {
      if (err) {
          console.error('Error deleting mentor:', err);
          return res.status(500).json({ success: false, message: 'Failed to delete mentor' });
      }
      res.status(200).json({ success: true, message: 'Mentor deleted successfully' });
  });
});


app.delete('/delete-placement/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM placements WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting placement:', err);
      return res.status(500).json({ error: 'Failed to delete placement' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json({ message: 'Placement deleted successfully' });
  });
});






// Add College Partner
app.post("/api/college-partners", upload.single("collegeLogo"), (req, res) => {
  const { collegeName } = req.body;
  const collegeLogo = req.file ? `/uploads/${req.file.filename}` : null;

  if (!collegeName || !collegeLogo) {
      return res.status(400).json({ success: false, message: "College name and logo are required!" });
  }

  const sql = "INSERT INTO college_partner (name, img) VALUES (?, ?)";
  db.query(sql, [collegeName, collegeLogo], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      res.status(201).json({ 
          success: true, 
          message: "College partner added successfully!",
          college: {
              id: result.insertId,
              name: collegeName,
              img: collegeLogo
          }
      });
  });
});

// Get All College Partners
app.get("/api/college-partners", (req, res) => {
  const sql = "SELECT * FROM college_partner ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      res.status(200).json({ success: true, colleges: results });
  });
});

// Delete College Partner
app.delete("/api/college-partners/:id", (req, res) => {
  const { id } = req.params;
  
  // First get the college to delete the image file
  const getSql = "SELECT img FROM college_partner WHERE id = ?";
  db.query(getSql, [id], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      
      if (results.length === 0) {
          return res.status(404).json({ success: false, message: "College partner not found!" });
      }

      const imgPath = results[0].img;
      const fs = require('fs');
      if (imgPath) {
          const filePath = path.join(__dirname, imgPath);
          fs.unlink(filePath, (err) => {
              if (err) console.error("Error deleting image file:", err);
          });
      }

      // Now delete from database
      const deleteSql = "DELETE FROM college_partner WHERE id = ?";
      db.query(deleteSql, [id], (err, result) => {
          if (err) {
              console.error(err);
              return res.status(500).json({ success: false, message: "Database error!" });
          }
          res.status(200).json({ success: true, message: "College partner deleted successfully!" });
      });
  });
});



// Add Corporate Partner
app.post("/api/corporate-partners", upload.single("partnerLogo"), (req, res) => {
  const { partnerName } = req.body;
  const partnerLogo = req.file ? `/uploads/${req.file.filename}` : null;

  if (!partnerName || !partnerLogo) {
      return res.status(400).json({ success: false, message: "Corporate name and logo are required!" });
  }

  const sql = "INSERT INTO corporate_partner (name, img) VALUES (?, ?)";
  db.query(sql, [partnerName, partnerLogo], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      res.status(201).json({ 
          success: true, 
          message: "Corporate partner added successfully!",
          partner: {  // Changed from 'college' to 'partner' for consistency
              id: result.insertId,
              name: partnerName,
              img: partnerLogo
          }
      });
  });
});

// Get All Corporate Partners
app.get("/api/corporate-partners", (req, res) => {
  const sql = "SELECT * FROM corporate_partner ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      res.status(200).json({ success: true, partners: results }); // Changed from 'colleges' to 'partners'
  });
});

// Delete Corporate Partner
app.delete("/api/corporate-partners/:id", (req, res) => {
  const { id } = req.params;
  
  // First get the corporate to delete the image file
  const getSql = "SELECT img FROM corporate_partner WHERE id = ?";
  db.query(getSql, [id], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Database error!" });
      }
      
      if (results.length === 0) {
          return res.status(404).json({ success: false, message: "Corporate partner not found!" });
      }

      const imgPath = results[0].img;
      const fs = require('fs');
      if (imgPath) {
          const filePath = path.join(__dirname, imgPath);
          fs.unlink(filePath, (err) => {
              if (err) console.error("Error deleting image file:", err);
          });
      }

      // Now delete from database
      const deleteSql = "DELETE FROM corporate_partner WHERE id = ?";
      db.query(deleteSql, [id], (err, result) => {
          if (err) {
              console.error(err);
              return res.status(500).json({ success: false, message: "Database error!" });
          }
          res.status(200).json({ success: true, message: "Corporate partner deleted successfully!" });
      });
  });
});



//----------------------------------------------------------------------//




// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
