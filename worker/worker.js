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

    // ── EDUCATOR STUDENT LIST ──
    // GET /students — list educator-created students
    if (method === 'GET' && path === '/students') {
      const data = await env.MATHQUEST_DB.get('edu_students');
      return json(data ? JSON.parse(data) : { students: [] });
    }
    // POST /students/:username — add a student to the list
    if (method === 'POST' && path.startsWith('/students/')) {
      const u = decodeURIComponent(path.slice(10));
      const raw = await env.MATHQUEST_DB.get('edu_students');
      const list = raw ? JSON.parse(raw) : { students: [] };
      if (!list.students.includes(u)) list.students.push(u);
      await env.MATHQUEST_DB.put('edu_students', JSON.stringify(list));
      return json({ ok: true });
    }
    // DELETE /students/:username — remove a student from the list
    if (method === 'DELETE' && path.startsWith('/students/')) {
      const u = decodeURIComponent(path.slice(10));
      const raw = await env.MATHQUEST_DB.get('edu_students');
      const list = raw ? JSON.parse(raw) : { students: [] };
      list.students = list.students.filter(s => s !== u);
      await env.MATHQUEST_DB.put('edu_students', JSON.stringify(list));
      return json({ ok: true });
    }

    // ── EDUCATOR PASSWORD ──
    if (method === 'GET' && path === '/edupass') {
      const data = await env.MATHQUEST_DB.get('edupass');
      if (!data) return json({ exists: false });
      const parsed = JSON.parse(data);
      return json({ exists: true, password: parsed.password, recoveryKey: parsed.recoveryKey });
    }
    if (method === 'POST' && path === '/edupass') {
      const body = await request.json();
      // Preserve existing recoveryKey if not provided
      const existing = await env.MATHQUEST_DB.get('edupass');
      const prev = existing ? JSON.parse(existing) : {};
      const updated = {
        password: body.password || prev.password,
        recoveryKey: body.recoveryKey || prev.recoveryKey,
      };
      await env.MATHQUEST_DB.put('edupass', JSON.stringify(updated));
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