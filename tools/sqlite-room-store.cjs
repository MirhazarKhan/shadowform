'use strict';
// The portable LAN server runs the identical prepared SQL and room API used by
// the hosted Worker. No npm install is needed to play with Node 22.13+.
const fs=require('fs'),path=require('path');
exports.open=function(location){
 let DatabaseSync;try{DatabaseSync=require('node:sqlite').DatabaseSync;}catch(e){throw Error('Install Node.js 22.13 or newer to run multiplayer.');}
 const sqlite=new DatabaseSync(location),root=path.resolve(__dirname,'..');
 sqlite.exec('PRAGMA foreign_keys = ON');
 sqlite.exec('CREATE TABLE IF NOT EXISTS spirit_local_migrations (name TEXT PRIMARY KEY)');
 for(const name of fs.readdirSync(path.join(root,'drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM spirit_local_migrations WHERE name = ?').get(name))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(fs.readFileSync(path.join(root,'drizzle',name),'utf8'));sqlite.prepare('INSERT INTO spirit_local_migrations (name) VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
 function prepare(sql){let bindings=[];const stmt=sqlite.prepare(sql);return {bind(...v){bindings=v;return this;},async first(){return stmt.get(...bindings)||null;},async all(){return {results:stmt.all(...bindings)};},async run(){const info=stmt.run(...bindings);return {success:true,meta:{changes:info.changes,last_row_id:Number(info.lastInsertRowid)}};},_run(){return {success:true,results:stmt.all(...bindings)};}};}
 const db={prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s._run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},withSession(){return this;},close(){sqlite.close();},raw:sqlite};return db;
};
