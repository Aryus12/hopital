import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/tableau-de-bord';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/tableau-de-bord';
  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => items.forEach(({name,value,options}) => response.cookies.set(name,value,options)) },
    });
    await supabase.auth.exchangeCodeForSession(code);
    return response;
  }
  return NextResponse.redirect(new URL('/connexion', origin));
}
