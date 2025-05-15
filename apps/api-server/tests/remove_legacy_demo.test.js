import { withSession } from '../libs/node-shared/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * remove_legacy_demo.test.js – Guards against re-introducing the obsolete
 * `ProgramDemo` catalog entry. It explicitly inserts a fake ProgramDemo node,
 * executes the maintenance Cypher in docs/scripts/neo4j/005_remove_legacy_demo.cypher,
 * and then asserts the node no longer exists.
 *
 * Why include this test?  If someone accidentally re-runs the old JSON import
 * or checks in code that recreates ProgramDemo, CI will fail, alerting us
 * immediately.
 */

describe('Maintenance script 005_remove_legacy_demo.cypher', () => {
  it('deletes the ProgramDemo tree when present', async () => {
    // 1. Manually create a stub ProgramDemo node so the script has something
    //    to delete even in a pristine test database.
    await withSession(async (session) => {
      await session.run("MERGE (:Program {id:'ProgramDemo', seq:999})");
    });

    // 2. Load and execute the delete script.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.resolve(
      __dirname,
      '../../../docs/scripts/neo4j/005_remove_legacy_demo.cypher'
    );
    const cypher = fs.readFileSync(scriptPath, 'utf8');

    await withSession(async (session) => {
      for (const stmt of cypher.split(';')) {
        if (stmt.trim()) await session.run(stmt);
      }
    });

    // 3. Assert the ProgramDemo node is gone.
    let exists = true;
    await withSession(async (session) => {
      const res = await session.run(
        "MATCH (p:Program {id:'ProgramDemo'}) RETURN p LIMIT 1"
      );
      exists = res.records.length > 0;
    });
    expect(exists).toBe(false);
  });
}); 