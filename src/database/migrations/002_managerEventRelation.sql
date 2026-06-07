ALTER TABLE events DROP COLUMN manager_id;

CREATE TABLE IF NOT EXISTS manager_events (
	manager_id INT NOT NULL,
	event_id   INT NOT NULL,
	PRIMARY KEY (manager_id, event_id),
	CONSTRAINT fk_me_manager FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
	CONSTRAINT fk_me_event   FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_manager_events_manager_id ON manager_events(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_events_event_id   ON manager_events(event_id);
