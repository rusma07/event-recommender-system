SELECT * FROM public.events
ORDER BY id ASC 


COPY events (title, event_url, image_url, date_string, location, tags ,price)
FROM 'D:\event-recommendation-system\backend\lib\events.csv'
DELIMITER ','
CSV HEADER;

SELECT current_user;



DELETE FROM events;


TRUNCATE TABLE events RESTART IDENTITY CASCADE;

SELECT * FROM public.events
ORDER BY id ASC

CREATE TABLE tag_similarities (
    id SERIAL PRIMARY KEY,
    tag_1 TEXT NOT NULL,
    tag_2 TEXT NOT NULL,
    similarity FLOAT NOT NULL,
    UNIQUE(tag_1, tag_2)
);

INSERT INTO tag_similarities (tag_1, tag_2, similarity) VALUES
('Tech', 'Ai', 0.85),
('Tech', 'Devops', 0.65),
('Tech', 'Education', 0.7),
('Tech', 'Engineering', 0.8),
('Tech', 'Web', 0.8),
('Tech', 'Cybersecurity', 0.65),
('Ai', 'Devops', 0.0),
('Ai', 'Education', 0.0),
('Devops', 'Cybersecurity', 0.6),
('Education', 'Online', 0.6),
('Web', 'Graphic Design', 0.6),
('Graphic Design', 'Art', 0.75),
('Community', 'Networking', 0.7);


