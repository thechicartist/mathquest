const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── USERS ──
    if (method === 'GET' && path === '/users') {
      const list = await env.MATHQUEST_DB.list({ prefix: 'user:' });
      const names = list.keys.map(k => k.name.replace('user:', ''));
      return json({ users: names });
    }
    if (method === 'GET' && path.startsWith('/user/')) {
      const u = decodeURIComponent(path.slice(6));
      const data = await env.MATHQUEST_DB.get('user:' + u);
      if (!data) return json({ error: 'not_found' }, 404);
      return json(JSON.parse(data));
    }
    if (method === 'POST' && path.startsWith('/user/')) {
      const u = decodeURIComponent(path.slice(6));
      const body = await request.json();
      await env.MATHQUEST_DB.put('user:' + u, JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'DELETE' && path.startsWith('/user/')) {
      const u = decodeURIComponent(path.slice(6));
      await env.MATHQUEST_DB.delete('user:' + u);
      await env.MATHQUEST_DB.delete('progress:' + u);
      await env.MATHQUEST_DB.delete('quests:' + u);
      return json({ ok: true });
    }

    // ── PROGRESS ──
    if (method === 'GET' && path.startsWith('/progress/')) {
      const u = decodeURIComponent(path.slice(10));
      const data = await env.MATHQUEST_DB.get('progress:' + u);
      return json(data ? JSON.parse(data) : {});
    }
    if (method === 'POST' && path.startsWith('/progress/')) {
      const u = decodeURIComponent(path.slice(10));
      const body = await request.json();
      await env.MATHQUEST_DB.put('progress:' + u, JSON.stringify(body));
      return json({ ok: true });
    }

    // ── QUESTS ──
    if (method === 'GET' && path.startsWith('/quests/')) {
      const u = decodeURIComponent(path.slice(8));
      const data = await env.MATHQUEST_DB.get('quests:' + u);
      return json(data ? JSON.parse(data) : {});
    }
    if (method === 'POST' && path.startsWith('/quests/')) {
      const u = decodeURIComponent(path.slice(8));
      const body = await request.json();
      await env.MATHQUEST_DB.put('quests:' + u, JSON.stringify(body));
      return json({ ok: true });
    }

    // ── EDUCATOR PROFILE ──
    if (method === 'GET' && path.startsWith('/educator/')) {
      const edu = decodeURIComponent(path.slice(10));
      const data = await env.MATHQUEST_DB.get('educator:' + edu);
      if (!data) return json({ error: 'not_found' }, 404);
      return json(JSON.parse(data));
    }
    if (method === 'POST' && path.startsWith('/educator/')) {
      const edu = decodeURIComponent(path.slice(10));
      const body = await request.json();
      await env.MATHQUEST_DB.put('educator:' + edu, JSON.stringify(body));
      return json({ ok: true });
    }

    // ── LEGACY: EDUCATOR STUDENT LISTS (kept for backwards compat) ──
    // GET  /edu-students/:educator
    if (method === 'GET' && path.startsWith('/edu-students/') && path.split('/').length === 3) {
      const edu = decodeURIComponent(path.slice(14));
      const data = await env.MATHQUEST_DB.get('edu_students:' + edu);
      return json(data ? JSON.parse(data) : { students: [] });
    }
    // POST /edu-students/:educator/:student
    if (method === 'POST' && path.startsWith('/edu-students/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const student = decodeURIComponent(parts[3]);
      if (!edu || !student) return json({ error: 'bad_request' }, 400);
      const raw = await env.MATHQUEST_DB.get('edu_students:' + edu);
      const list = raw ? JSON.parse(raw) : { students: [] };
      if (!list.students.includes(student)) list.students.push(student);
      await env.MATHQUEST_DB.put('edu_students:' + edu, JSON.stringify(list));
      return json({ ok: true });
    }
    // DELETE /edu-students/:educator/:student
    if (method === 'DELETE' && path.startsWith('/edu-students/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const student = decodeURIComponent(parts[3]);
      if (!edu || !student) return json({ error: 'bad_request' }, 400);
      const raw = await env.MATHQUEST_DB.get('edu_students:' + edu);
      const list = raw ? JSON.parse(raw) : { students: [] };
      list.students = list.students.filter(s => s !== student);
      await env.MATHQUEST_DB.put('edu_students:' + edu, JSON.stringify(list));
      return json({ ok: true });
    }

    // ── EDUCATOR CLASSES ──
    // GET  /edu-classes/:educator
    //   → returns { classes: [ { id, name, grade, emoji }, … ] }
    if (method === 'GET' && path.startsWith('/edu-classes/') && path.split('/').length === 3) {
      const edu = decodeURIComponent(path.slice(13));
      const data = await env.MATHQUEST_DB.get('edu_classes:' + edu);
      return json(data ? JSON.parse(data) : { classes: [] });
    }
    // POST /edu-classes/:educator/:classId
    //   body: { id, name, grade, emoji }  → upserts the class in the educator's list
    if (method === 'POST' && path.startsWith('/edu-classes/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      if (!edu || !classId) return json({ error: 'bad_request' }, 400);
      const body = await request.json();
      const raw = await env.MATHQUEST_DB.get('edu_classes:' + edu);
      const store = raw ? JSON.parse(raw) : { classes: [] };
      const idx = store.classes.findIndex(c => c.id === classId);
      if (idx >= 0) {
        store.classes[idx] = { ...store.classes[idx], ...body };
      } else {
        store.classes.push({ id: classId, ...body });
      }
      await env.MATHQUEST_DB.put('edu_classes:' + edu, JSON.stringify(store));
      return json({ ok: true });
    }
    // DELETE /edu-classes/:educator/:classId
    //   → removes class record + its student roster (does NOT delete student accounts)
    if (method === 'DELETE' && path.startsWith('/edu-classes/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      if (!edu || !classId) return json({ error: 'bad_request' }, 400);
      const raw = await env.MATHQUEST_DB.get('edu_classes:' + edu);
      const store = raw ? JSON.parse(raw) : { classes: [] };
      store.classes = store.classes.filter(c => c.id !== classId);
      await env.MATHQUEST_DB.put('edu_classes:' + edu, JSON.stringify(store));
      // Also delete the class's student roster
      await env.MATHQUEST_DB.delete('class_students:' + edu + ':' + classId);
      return json({ ok: true });
    }

    // ── CLASS STUDENT ROSTERS ──
    // GET  /class-students/:educator/:classId
    //   → returns { students: [ "alice", "bob", … ] }
    if (method === 'GET' && path.startsWith('/class-students/') && path.split('/').length === 4) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      const data = await env.MATHQUEST_DB.get('class_students:' + edu + ':' + classId);
      return json(data ? JSON.parse(data) : { students: [] });
    }
    // POST /class-students/:educator/:classId/:student
    //   → adds student to the class roster
    if (method === 'POST' && path.startsWith('/class-students/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      const student = decodeURIComponent(parts[4]);
      if (!edu || !classId || !student) return json({ error: 'bad_request' }, 400);
      const key = 'class_students:' + edu + ':' + classId;
      const raw = await env.MATHQUEST_DB.get(key);
      const list = raw ? JSON.parse(raw) : { students: [] };
      if (!list.students.includes(student)) list.students.push(student);
      await env.MATHQUEST_DB.put(key, JSON.stringify(list));
      return json({ ok: true });
    }
    // DELETE /class-students/:educator/:classId/:student
    //   → removes student from class roster (does NOT delete the user account)
    if (method === 'DELETE' && path.startsWith('/class-students/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      const student = decodeURIComponent(parts[4]);
      if (!edu || !classId || !student) return json({ error: 'bad_request' }, 400);
      const key = 'class_students:' + edu + ':' + classId;
      const raw = await env.MATHQUEST_DB.get(key);
      const list = raw ? JSON.parse(raw) : { students: [] };
      list.students = list.students.filter(s => s !== student);
      await env.MATHQUEST_DB.put(key, JSON.stringify(list));
      return json({ ok: true });
    }

    return json({ error: 'not_found' }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}