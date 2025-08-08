-- ✅ Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,  -- Store hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Events Table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_url TEXT,
    external_url TEXT,
    start_date DATE,
    end_date DATE,
    platform TEXT,
    tags TEXT[],  -- PostgreSQL array
    price TEXT
);

-- ✅ Interactions Table
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    
    interaction_type TEXT CHECK (
        interaction_type IN (
            'view', 
            'register', 
            'search', 
            'tag_click'
        )
    ),
    
    meta JSONB, -- e.g., { "query": "AI conference" }
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
