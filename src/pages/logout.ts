import type { APIRoute } from 'astro'
import { SESSION_COOKIE } from '../lib/auth'

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' })
  return redirect('/login', 303)
}

export const GET: APIRoute = ({ redirect }) => redirect('/', 302)
