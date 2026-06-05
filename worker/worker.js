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

    // ── EDUCATOR PROFILE AUTHENTICATION ──
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

    // ── EDUCATOR STUDENT LISTS ──
    // Matches: GET /edu-students/:educator_username
    if (method === 'GET' && path.startsWith('/edu-students/')) {
      const edu = decodeURIComponent(path.slice(14));
      const data = await env.MATHQUEST_DB.get('edu_students:' + edu);
      return json(data ? JSON.parse(data) : { students: [] });
    }

    // Matches: POST /edu-students/:educator_username/:student_username
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

    // Matches: DELETE /edu-students/:educator_username/:student_username
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

    // Fallback 404 handler for unmatched routes
    return json({ error: 'not_found' }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}