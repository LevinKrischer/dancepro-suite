import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseEnvironmentLocal() {
  const filePath = resolve(process.cwd(), 'src/environments/environment.local.ts');
  if (!existsSync(filePath)) {
    return {};
  }

  const source = readFileSync(filePath, 'utf8');
  const supabaseUrlMatch = source.match(/supabaseUrl:\s*'([^']+)'/);
  const supabaseAnonKeyMatch = source.match(/supabaseAnonKey:\s*'([^']+)'/);

  return {
    supabaseUrl: supabaseUrlMatch?.[1],
    supabaseAnonKey: supabaseAnonKeyMatch?.[1],
  };
}

function envOrFallback(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function getConfig() {
  const localEnv = parseEnvironmentLocal();

  const supabaseUrl = envOrFallback('SUPABASE_URL', localEnv.supabaseUrl);
  const supabaseAnonKey = envOrFallback('SUPABASE_ANON_KEY', localEnv.supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'SUPABASE_URL oder SUPABASE_ANON_KEY fehlt. Setze Umgebungsvariablen oder pruefe src/environments/environment.local.ts.'
    );
  }

  const defaultPassword = process.env.TEST_USER_PASSWORD ?? '';

  const users = [
    {
      role: 'owner',
      email: envOrFallback('OWNER_EMAIL', 'owner@dancepro.local'),
      password: envOrFallback('OWNER_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: true,
        courseUpdate: true,
        invoiceInsert: true,
      },
    },
    {
      role: 'admin',
      email: envOrFallback('ADMIN_EMAIL', 'admin@dancepro.local'),
      password: envOrFallback('ADMIN_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: true,
        courseUpdate: true,
        invoiceInsert: true,
      },
    },
    {
      role: 'reception',
      email: envOrFallback('RECEPTION_EMAIL', 'reception@dancepro.local'),
      password: envOrFallback('RECEPTION_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: true,
        courseUpdate: true,
        invoiceInsert: false,
      },
    },
    {
      role: 'instructor',
      email: envOrFallback('INSTRUCTOR_EMAIL', 'instructor@dancepro.local'),
      password: envOrFallback('INSTRUCTOR_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: false,
        courseUpdate: true,
        invoiceInsert: false,
      },
    },
    {
      role: 'accounting',
      email: envOrFallback('ACCOUNTING_EMAIL', 'accounting@dancepro.local'),
      password: envOrFallback('ACCOUNTING_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: false,
        courseUpdate: false,
        invoiceInsert: true,
      },
    },
    {
      role: 'customer',
      email: envOrFallback('CUSTOMER_EMAIL', 'customer1@dancepro.local'),
      password: envOrFallback('CUSTOMER_PASSWORD', defaultPassword),
      expected: {
        ownProfileRead: true,
        customerInsert: false,
        courseUpdate: false,
        invoiceInsert: false,
      },
    },
  ];

  const missingPasswords = users.filter((u) => !u.password);
  if (missingPasswords.length) {
    const names = missingPasswords.map((u) => u.role).join(', ');
    throw new Error(
      `Passwoerter fehlen fuer: ${names}. Setze TEST_USER_PASSWORD oder spezifische *_PASSWORD Variablen.`
    );
  }

  return { supabaseUrl, supabaseAnonKey, users };
}

function createAuthedClient(supabaseUrl, supabaseAnonKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function getCourseId(client) {
  const { data, error } = await client.schema('app').from('courses').select('id').limit(1).maybeSingle();
  if (error) return { error: error.message };
  if (!data?.id) return { error: 'Keine Zeile in app.courses gefunden.' };
  return { id: data.id };
}

async function getCustomerId(client) {
  const { data, error } = await client
    .schema('app')
    .from('customers')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data?.id) return { error: 'Keine Zeile in app.customers gefunden.' };
  return { id: data.id };
}

async function testOwnProfileRead(client, userId) {
  const { error } = await client
    .schema('app')
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .limit(1);

  return { success: !error, detail: error?.message ?? 'ok' };
}

async function testCustomerInsert(client, role) {
  const timestamp = Date.now();
  const payload = {
    first_name: 'RLS',
    last_name: `Matrix_${role}_${timestamp}`,
    email: `rls-${role}-${timestamp}@example.local`,
  };

  const { error } = await client.schema('app').from('customers').insert(payload);
  return { success: !error, detail: error?.message ?? 'ok' };
}

async function testCourseUpdate(client, courseId) {
  const { data, error } = await client
    .schema('app')
    .from('courses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', courseId)
    .select('id')
    .limit(1);

  if (error) {
    return { success: false, detail: error.message };
  }

  const updatedRows = Array.isArray(data) ? data.length : 0;
  if (updatedRows < 1) {
    return {
      success: false,
      detail: 'ok (0 rows updated - likely denied by RLS)',
    };
  }

  return { success: true, detail: 'ok' };
}

async function testInvoiceInsert(client, customerId, role) {
  const timestamp = Date.now();
  const payload = {
    customer_id: customerId,
    invoice_no: `INV-RLS-${role}-${timestamp}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    currency: 'EUR',
    total_amount: 1.0,
    status: 'open',
    notes: 'RLS matrix test',
  };

  const { error } = await client.schema('app').from('invoices').insert(payload);
  return { success: !error, detail: error?.message ?? 'ok' };
}

async function run() {
  const { supabaseUrl, supabaseAnonKey, users } = getConfig();
  const results = [];

  for (const user of users) {
    const client = createAuthedClient(supabaseUrl, supabaseAnonKey);
    const signIn = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (signIn.error || !signIn.data.user) {
      results.push({
        role: user.role,
        action: 'login',
        expected: true,
        actual: false,
        pass: false,
        detail: signIn.error?.message ?? 'Unbekannter Login-Fehler',
      });
      continue;
    }

    const userId = signIn.data.user.id;
    const courseRef = await getCourseId(client);
    const customerRef = await getCustomerId(client);

    const checks = [
      {
        key: 'ownProfileRead',
        label: 'own_profile_read',
        expected: user.expected.ownProfileRead,
        run: () => testOwnProfileRead(client, userId),
      },
      {
        key: 'customerInsert',
        label: 'customer_insert',
        expected: user.expected.customerInsert,
        run: () => testCustomerInsert(client, user.role),
      },
      {
        key: 'courseUpdate',
        label: 'course_update',
        expected: user.expected.courseUpdate,
        run: async () => {
          if (courseRef.error) return { success: false, detail: `Prereq: ${courseRef.error}` };
          return testCourseUpdate(client, courseRef.id);
        },
      },
      {
        key: 'invoiceInsert',
        label: 'invoice_insert',
        expected: user.expected.invoiceInsert,
        run: async () => {
          if (customerRef.error) return { success: false, detail: `Prereq: ${customerRef.error}` };
          return testInvoiceInsert(client, customerRef.id, user.role);
        },
      },
    ];

    for (const check of checks) {
      const res = await check.run();
      const actual = !!res.success;
      const pass = actual === check.expected;

      results.push({
        role: user.role,
        action: check.label,
        expected: check.expected,
        actual,
        pass,
        detail: res.detail,
      });
    }

    await client.auth.signOut();
  }

  const printRows = results.map((r) => ({
    role: r.role,
    action: r.action,
    expected: r.expected ? 'ALLOW' : 'DENY',
    actual: r.actual ? 'ALLOW' : 'DENY',
    result: r.pass ? 'PASS' : 'FAIL',
    detail: r.pass ? '' : r.detail,
  }));

  console.log('\nRLS Soll/Ist Matrix\n');
  console.table(printRows);

  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error(`\nFehlgeschlagene Checks: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log('\nAlle Checks PASS.');
  }
}

run().catch((error) => {
  console.error('Skriptfehler:', error.message);
  process.exitCode = 1;
});
