import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl
	const accessToken = request.cookies.get('oz_access_token')?.value
	const isAuthenticated = Boolean(accessToken)

	// Never gate API/static routes here.
	if (pathname.startsWith('/api')) {
		return NextResponse.next()
	}
	const hostname = request.headers.get('host') || ''
	// Check if request is from admin subdomain or preview
	const isVercelPreview = hostname.includes('.vercel.app')
	const previewAdminMode = searchParams.get('admin') === 'true'
	const isAdminSubdomain = hostname.startsWith('admin.') || (isVercelPreview && previewAdminMode)

	// Define auth pages that should work on admin subdomain
	const authPages = ['/login', '/signin', '/signup', '/welcome', '/forget-password', '/reset-password']
	const isAuthPage = authPages.some(page => pathname.startsWith(page))
	const protectedPages = ['/dashboard', '/categories', '/customer-details', '/customers']
	const isProtectedPage = protectedPages.some(page => pathname.startsWith(page))

	if (!isAuthenticated && isProtectedPage) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	if (isAuthenticated && isAuthPage) {
		return NextResponse.redirect(new URL('/dashboard', request.url))
	}

	// Handle admin subdomain routing
	if (isAdminSubdomain) {
		// Allow auth pages on admin subdomain
		if (isAuthPage) {
			return NextResponse.next()
		}

		// Redirect dashboard routes to admin-panel when on admin subdomain
		if (pathname.startsWith('/dashboard')) {
			return NextResponse.redirect(new URL('/admin-panel', request.url))
		}

		// Only allow admin routes on admin subdomain
		if (
			!pathname.startsWith('/admin-panel') &&
			!pathname.startsWith('/admin') &&
			!pathname.startsWith('/crm')
		) {
			return NextResponse.redirect(new URL('/admin-panel', request.url))
		}
	} else {
		// Not on admin subdomain - block direct access to admin routes
		if (
			pathname.startsWith('/admin-panel') ||
			pathname.startsWith('/admin') ||
			pathname.startsWith('/crm')
		) {
			return NextResponse.redirect(new URL('/login', request.url))
		}
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - api/auth (auth API routes)
		 */
		'/((?!_next/static|_next/image|favicon.ico|public).*)'
	]
}


