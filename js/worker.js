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

    // ── STUDENTS ──
    if (method === 'GET' && path === '/students') {
      const parentFilter = url.searchParams.get('parent');
      const list = await env.MATHQUEST_DB.list({ prefix: 'student:' });
      const students = [];
      for (const key of list.keys) {
        const raw = await env.MATHQUEST_DB.get(key.name);
        if (!raw) continue;
        const s = JSON.parse(raw);
        if (!parentFilter || s.parentUsername === parentFilter) {
          students.push(s);
        }
      }
      return json({ students });
    }

    // ── PARENT ──
    if (method === 'GET' && path.startsWith('/parent/')) {
      const u = decodeURIComponent(path.slice(8));
      const data = await env.MATHQUEST_DB.get('parent:' + u);
      if (!data) return json({ error: 'not_found' }, 404);
      return json(JSON.parse(data));
    }
    if (method === 'POST' && path.startsWith('/parent/')) {
      const u = decodeURIComponent(path.slice(8));
      const body = await request.json();
      await env.MATHQUEST_DB.put('parent:' + u, JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'DELETE' && path.startsWith('/parent/')) {
      const u = decodeURIComponent(path.slice(8));
      await env.MATHQUEST_DB.delete('parent:' + u);
      return json({ ok: true });
    }

    // ── STUDENT (individual) ──
    if (method === 'POST' && path === '/student') {
      const body = await request.json();
      const { username, name, grade, password, parentUsername } = body;
      if (!username || !password) return json({ error: 'username and password required' }, 400);
      const existing = await env.MATHQUEST_DB.get('student:' + username)
        || await env.MATHQUEST_DB.get('user:' + username);
      if (existing) return json({ error: 'Username already taken. Try a different one!' }, 409);
      const record = { username, name, grade, password, parentUsername: parentUsername || null, createdAt: Date.now() };
      await env.MATHQUEST_DB.put('student:' + username, JSON.stringify(record));
      await env.MATHQUEST_DB.put('user:' + username, JSON.stringify({ name, grade, password, role: 'student', parentUsername: parentUsername || null }));
      return json({ ok: true });
    }
    if (method === 'GET' && path.startsWith('/student/')) {
      const u = decodeURIComponent(path.slice(9));
      const data = await env.MATHQUEST_DB.get('student:' + u);
      if (!data) return json({ error: 'not_found' }, 404);
      return json(JSON.parse(data));
    }
    if (method === 'DELETE' && path.startsWith('/student/')) {
      const u = decodeURIComponent(path.slice(9));
      await env.MATHQUEST_DB.delete('student:' + u);
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

    // ── EDUCATOR STUDENT LISTS ──
    if (method === 'GET' && path.startsWith('/edu-students/') && path.split('/').length === 3) {
      const edu = decodeURIComponent(path.slice(14));
      const data = await env.MATHQUEST_DB.get('edu_students:' + edu);
      return json(data ? JSON.parse(data) : { students: [] });
    }
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
    if (method === 'GET' && path.startsWith('/edu-classes/') && path.split('/').length === 3) {
      const edu = decodeURIComponent(path.slice(13));
      const data = await env.MATHQUEST_DB.get('edu_classes:' + edu);
      return json(data ? JSON.parse(data) : { classes: [] });
    }
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
    if (method === 'DELETE' && path.startsWith('/edu-classes/')) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      if (!edu || !classId) return json({ error: 'bad_request' }, 400);
      const raw = await env.MATHQUEST_DB.get('edu_classes:' + edu);
      const store = raw ? JSON.parse(raw) : { classes: [] };
      store.classes = store.classes.filter(c => c.id !== classId);
      await env.MATHQUEST_DB.put('edu_classes:' + edu, JSON.stringify(store));
      await env.MATHQUEST_DB.delete('class_students:' + edu + ':' + classId);
      return json({ ok: true });
    }

    // ── CLASS STUDENT ROSTERS ──
    if (method === 'GET' && path.startsWith('/class-students/') && path.split('/').length === 4) {
      const parts = path.split('/');
      const edu = decodeURIComponent(parts[2]);
      const classId = decodeURIComponent(parts[3]);
      const data = await env.MATHQUEST_DB.get('class_students:' + edu + ':' + classId);
      return json(data ? JSON.parse(data) : { students: [] });
    }
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

    // ── STRIPE CHECKOUT ──
    if (method === 'POST' && path === '/create-checkout-session') {
      const body = await request.json();
      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': 'MathQuest Parent Account',
          'line_items[0][price_data][unit_amount]': '499',
          'line_items[0][quantity]': '1',
          'customer_email': body.email,
          'metadata[username]': body.username,
          'success_url': body.successUrl,
          'cancel_url': body.cancelUrl,
        }).toString()
      });
      const session = await stripeRes.json();
      if (!stripeRes.ok) return json({ error: session.error?.message || 'Stripe error' }, 400);
      return json({ url: session.url });
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