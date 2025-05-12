CREATE CONSTRAINT program_id IF NOT EXISTS FOR (p:Program) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT module_id IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT day_id IF NOT EXISTS FOR (d:Day) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT persona_id IF NOT EXISTS FOR (per:Persona) REQUIRE per.id IS UNIQUE;
CREATE CONSTRAINT turn_id IF NOT EXISTS FOR (t:Turn) REQUIRE t.id IS UNIQUE;
CREATE INDEX candidate_by_parent_ts IF NOT EXISTS FOR (t:Turn) ON (t.parent_id, t.ts);
CREATE INDEX module_by_prog IF NOT EXISTS FOR (m:Module) ON (m.seq);
CREATE INDEX day_by_module IF NOT EXISTS FOR (d:Day) ON (d.seq);
CREATE VECTOR INDEX turnEmbedding IF NOT EXISTS
FOR (t:Turn) ON (t.embedding)
OPTIONS {
    indexConfig: {
        `vector.dimensions`: 384,
        `vector.similarity_function`: 'cosine'
    }
};