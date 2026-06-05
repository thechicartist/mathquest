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

    if (request.method === 'GET' && path === '/users') {
      const list = await env.MATHQUEST_DB.list({ prefix: 'user:' });
      const names = list.keys.map(k => k.name.replace('user:', ''));
      return json({ users: names });
    }

    if (request.method === 'GET' && path.startsWith('/user/')) {
      const username = decodeURIComponent(path.split('/user/')[1]);
      const data = await env.MATHQUEST_DB.get('user:' + username);
      if (!data) return json({ error: 'not_found' }, 404);
      return json(JSON.parse(data));
    }

    if (request.method === 'POST' && path.startsWith('/user/')) {
      const username = decodeURIComponent(path.split('/user/')[1]);
      const body = await request.json();
      await env.MATHQUEST_DB.put('user:' + username, JSON.stringify(body));
      return json({ ok: true });
    }

    if (request.method === 'DELETE' && path.startsWith('/user/')) {
      const username = decodeURIComponent(path.split('/user/')[1]);
      await env.MATHQUEST_DB.delete('user:' + username);
      await env.MATHQUEST_DB.delete('progress:' + username);
      await env.MATHQUEST_DB.delete('quests:' + username);
      return json({ ok: true });
    }

    if (request.method === 'GET' && path.startsWith('/progress/')) {
      const username = decodeURIComponent(path.split('/progress/')[1]);
      const data = await env.MATHQUEST_DB.get('progress:' + username);
      return json(data ? JSON.parse(data) : {});
    }

    if (request.method === 'POST' && path.startsWith('/progress/')) {
      const username = decodeURIComponent(path.split('/progress/')[1]);
      const body = await request.json();
      await env.MATHQUEST_DB.put('progress:' + username, JSON.stringify(body));
      return json({ ok: true });
    }

    if (request.method === 'GET' && path.startsWith('/quests/')) {
      const username = decodeURIComponent(path.split('/quests/')[1]);
      const data = await env.MATHQUEST_DB.get('quests:' + username);
      return json(data ? JSON.parse(data) : {});
    }

    if (request.method === 'POST' && path.startsWith('/quests/')) {
      const username = decodeURIComponent(path.split('/quests/')[1]);
      const body = await request.json();
      await env.MATHQUEST_DB.put('quests:' + username, JSON.stringify(body));
      return json({ ok: true });
    }

    if (request.method === 'GET' && path === '/students') {
      const list = await env.MATHQUEST_DB.list({ prefix: 'student:' });
      const names = list.keys.map(k => k.name.replace('student:', ''));
      return json({ students: names });
    }

    if (request.method === 'POST' && path.startsWith('/students/')) {
      const username = decodeURIComponent(path.split('/students/')[1]);
      await env.MATHQUEST_DB.put('student:' + username, '1');
      return json({ ok: true });
    }

    if (request.method === 'DELETE' && path.startsWith('/students/')) {
      const username = decodeURIComponent(path.split('/students/')[1]);
      await env.MATHQUEST_DB.delete('student:' + username);
      return json({ ok: true });
    }

    if (request.method === 'GET' && path === '/reset-edu') {
      const secret = url.searchParams.get('secret');
      const stored = await env.MATHQUEST_DB.get('reset_secret');
      // First time: if no secret stored yet, set it and confirm
      if (!stored) {
        if (!secret) return new Response('No secret set yet. Visit /reset-edu?secret=YOURSECRET to set one.', { headers: CORS });
        await env.MATHQUEST_DB.put('reset_secret', secret);
        return new Response('✅ Secret saved! Use this URL to reset educator password anytime.', { headers: CORS });
      }
      if (secret !== stored) return new Response('❌ Wrong secret.', { status: 403, headers: CORS });
      await env.MATHQUEST_DB.delete('educator_password');
      return new Response('✅ Educator password reset! Open the dashboard to create a new one.', { headers: CORS });
    }

    if (request.method === 'GET' && path === '/edupass') {
      const data = await env.MATHQUEST_DB.get('educator_password');
      if (!data) return json({ exists: false });
      try {
        const parsed = JSON.parse(data);
        return json({ exists: true, ...parsed });
      } catch(e) {
        // legacy: plain password string
        return json({ exists: true, password: data });
      }
    }

    if (request.method === 'POST' && path === '/edupass') {
      const body = await request.json();
      if (!body.password) return json({ error: 'no_password' }, 400);
      await env.MATHQUEST_DB.put('educator_password', JSON.stringify({ password: body.password, recoveryKey: body.recoveryKey || '' }));
      return json({ ok: true });
    }

    return json({ error: 'not_found' }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}