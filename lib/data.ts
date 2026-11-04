export interface Institution {
  id: string
  name: string
  shortName: string
  city: string
  domain: string
}

export interface Store {
  id: string
  institutionId: string
  name: string
  location: string
}

export type Condition = 'New' | 'Like New' | 'Good' | 'Fair'
export type ListingType = 'buy' | 'borrow' | 'both'

export interface Book {
  id: string
  title: string
  author: string
  edition: string
  isbn: string
  category: string
  courses: string[]
  cover: string
  /** Item value — the purchase price and the base for borrow fee and deposit. */
  value: number
  condition: Condition
  listingType: ListingType
  storeId: string
  available: number
  addedDaysAgo: number
  rating?: number
  reviewsCount?: number
  itemId?: string
  storeCode?: string
  institutionCode?: string
}

export const institutions: Institution[] = [
  { id: 'mnnit', name: 'Motilal Nehru National Institute of Technology', shortName: 'MNNIT Allahabad', city: 'Prayagraj', domain: 'mnnit.ac.in' },
  { id: 'iiita', name: 'Indian Institute of Information Technology', shortName: 'IIIT Allahabad', city: 'Prayagraj', domain: 'iiita.ac.in' },
  { id: 'iitbhu', name: 'Indian Institute of Technology (BHU)', shortName: 'IIT (BHU) Varanasi', city: 'Varanasi', domain: 'iitbhu.ac.in' },
  { id: 'allduniv', name: 'University of Allahabad', shortName: 'University of Allahabad', city: 'Prayagraj', domain: 'allduniv.ac.in' },
]

export const stores: Store[] = [
  { id: 'st-mnnit', institutionId: 'mnnit', name: 'Unikart · MNNIT', location: 'Central Library, Ground Floor' },
  { id: 'st-iiita', institutionId: 'iiita', name: 'Unikart · IIIT-A', location: 'Admin Block, Jhalwa Campus' },
  { id: 'st-iitbhu', institutionId: 'iitbhu', name: 'Unikart · IIT (BHU)', location: 'Students Activity Centre' },
  { id: 'st-allduniv', institutionId: 'allduniv', name: 'Unikart · AU', location: 'Senate House Annexe' },
]

export const CATEGORIES = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Electronics',
  'Mechanical',
  'Management',
  'Lecture Notes',
  'Exam Prep',
] as const

export const CONDITIONS: Condition[] = ['New', 'Like New', 'Good', 'Fair']

export const books: Book[] = [
  { id: 'bk-1001', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', edition: '4th Edition', isbn: '978-0262046305', category: 'Computer Science', courses: ['CS2102', 'CS3101'], cover: '/covers/algorithms.png', value: 1450, condition: 'Like New', listingType: 'both', storeId: 'st-mnnit', available: 4, addedDaysAgo: 2 },
  { id: 'bk-1002', title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', edition: '10th Edition', isbn: '978-1119800361', category: 'Computer Science', courses: ['CS3201'], cover: '/covers/operating-systems.png', value: 980, condition: 'Good', listingType: 'both', storeId: 'st-mnnit', available: 2, addedDaysAgo: 5 },
  { id: 'bk-1003', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', edition: '6th Edition', isbn: '978-9356063129', category: 'Computer Science', courses: ['CS3202'], cover: '/covers/networks.png', value: 875, condition: 'New', listingType: 'buy', storeId: 'st-iiita', available: 6, addedDaysAgo: 1 },
  { id: 'bk-1004', title: 'Higher Engineering Mathematics', author: 'Dr. B. S. Grewal', edition: '44th Edition', isbn: '978-8193328491', category: 'Mathematics', courses: ['MA1101', 'MA1201'], cover: '/covers/engineering-maths.png', value: 720, condition: 'Good', listingType: 'both', storeId: 'st-mnnit', available: 9, addedDaysAgo: 12 },
  { id: 'bk-1005', title: 'Concepts of Physics, Vol. 1', author: 'H. C. Verma', edition: 'Revised 2024', isbn: '978-8177091878', category: 'Physics', courses: ['PH1101'], cover: '/covers/physics.png', value: 495, condition: 'Fair', listingType: 'borrow', storeId: 'st-allduniv', available: 3, addedDaysAgo: 20 },
  { id: 'bk-1006', title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', edition: '7th Edition', isbn: '978-9390727506', category: 'Computer Science', courses: ['CS2203'], cover: '/covers/database.png', value: 1120, condition: 'Like New', listingType: 'both', storeId: 'st-iiita', available: 0, addedDaysAgo: 8 },
  { id: 'bk-1007', title: 'Signals and Systems', author: 'Oppenheim, Willsky', edition: '2nd Edition', isbn: '978-9332550230', category: 'Electronics', courses: ['EC2101'], cover: '/covers/signals.png', value: 890, condition: 'Good', listingType: 'borrow', storeId: 'st-mnnit', available: 1, addedDaysAgo: 15 },
  { id: 'bk-1008', title: 'Principles of Economics', author: 'N. Gregory Mankiw', edition: '9th Edition', isbn: '978-9355736468', category: 'Management', courses: ['HS2101'], cover: '/covers/economics.png', value: 1050, condition: 'New', listingType: 'buy', storeId: 'st-iitbhu', available: 5, addedDaysAgo: 3 },
  { id: 'bk-1009', title: 'Fundamentals of Thermodynamics', author: 'Borgnakke, Sonntag', edition: '10th Edition', isbn: '978-1119723653', category: 'Mechanical', courses: ['ME2102'], cover: '/covers/thermodynamics.png', value: 940, condition: 'Good', listingType: 'both', storeId: 'st-iitbhu', available: 2, addedDaysAgo: 6 },
  { id: 'bk-1010', title: 'Discrete Mathematics and Its Applications', author: 'Kenneth H. Rosen', edition: '8th Edition', isbn: '978-9353165413', category: 'Mathematics', courses: ['MA2103', 'CS2101'], cover: '/covers/discrete-maths.png', value: 865, condition: 'Like New', listingType: 'both', storeId: 'st-mnnit', available: 3, addedDaysAgo: 1 },
  { id: 'bk-1011', title: 'Data Structures — Lecture Notes, Sem 3', author: 'Compiled by Unikart Academic Desk', edition: 'Session 2026–27', isbn: 'UNK-NT-CS203', category: 'Lecture Notes', courses: ['CS2102'], cover: '/covers/dsa-notes.png', value: 180, condition: 'New', listingType: 'buy', storeId: 'st-mnnit', available: 24, addedDaysAgo: 4 },
  { id: 'bk-1012', title: 'GATE CSE — Previous Year Solved Papers', author: 'Made Easy Editorial Board', edition: '2015–2026', isbn: '978-9349127432', category: 'Exam Prep', courses: ['GATE'], cover: '/covers/gate-papers.png', value: 350, condition: 'Good', listingType: 'both', storeId: 'st-allduniv', available: 7, addedDaysAgo: 9 },
]

export function resolveInstitutionId(input?: {
  code?: string | null
  id?: string | null
  name?: string | null
  email?: string | null
}): string {
  if (!input) return ''
  const code = (input.code || '').toLowerCase().trim()
  if (code === 'iiita' || code === 'iiit') return 'iiita'
  if (code === 'mnnit') return 'mnnit'
  if (code === 'iitbhu' || code === 'bhu') return 'iitbhu'
  if (code === 'uoa' || code === 'allduniv') return 'allduniv'

  const id = (input.id || '').toLowerCase().trim()
  if (id === 'a0000000-0000-0000-0000-000000000002' || id === 'iiita' || id === 'st-iiita') return 'iiita'
  if (id === 'a0000000-0000-0000-0000-000000000001' || id === 'mnnit' || id === 'st-mnnit') return 'mnnit'
  if (id === 'a0000000-0000-0000-0000-000000000003' || id === 'allduniv' || id === 'uoa' || id === 'st-allduniv') return 'allduniv'

  const email = (input.email || '').toLowerCase().trim()
  if (email.includes('@iiita.ac.in')) return 'iiita'
  if (email.includes('@mnnit.ac.in')) return 'mnnit'
  if (email.includes('@itbhu.ac.in') || email.includes('@iitbhu.ac.in')) return 'iitbhu'
  if (email.includes('@allduniv.ac.in')) return 'allduniv'

  const name = (input.name || '').toLowerCase()
  if (name.includes('information technology') || name.includes('iiit')) return 'iiita'
  if (name.includes('motilal') || name.includes('mnnit')) return 'mnnit'
  if (name.includes('banaras') || name.includes('bhu')) return 'iitbhu'
  if (name.includes('allahabad') && name.includes('university')) return 'allduniv'

  return code || id || ''
}

export const getStore = (id: string) => {
  if (!id) return stores[0]
  const clean = id.toLowerCase().trim()
  const found = stores.find((s) => s.id.toLowerCase() === clean || s.institutionId.toLowerCase() === clean)
  if (found) return found
  if (clean === 'b0000000-0000-0000-0000-000000000003' || clean === 'a0000000-0000-0000-0000-000000000003' || clean === 'uoa' || clean === 'allduniv') {
    return stores.find((s) => s.id === 'st-allduniv') || stores[3] || stores[0]
  }
  if (clean === 'b0000000-0000-0000-0000-000000000002' || clean === 'a0000000-0000-0000-0000-000000000002' || clean === 'iiita') {
    return stores.find((s) => s.id === 'st-iiita') || stores[0]
  }
  if (clean === 'b0000000-0000-0000-0000-000000000001' || clean === 'a0000000-0000-0000-0000-000000000001' || clean === 'mnnit') {
    return stores.find((s) => s.id === 'st-mnnit') || stores[0]
  }
  return stores[0]
}

export function listingToBook(l: any): Book {
  const resolveStoreId = (sId: string) => {
    if (!sId) return 'st-mnnit'
    const c = sId.toLowerCase()
    if (c.includes('0003') || c.includes('allduniv') || c.includes('uoa')) return 'st-allduniv'
    if (c.includes('0002') || c.includes('iiita')) return 'st-iiita'
    if (c.includes('0001') || c.includes('mnnit')) return 'st-mnnit'
    return sId
  }

  const condMap: Record<string, Condition> = {
    NEW: 'New',
    GOOD: 'Good',
    FAIR: 'Fair',
    DAMAGED: 'Fair',
  }

  const modeMap: Record<string, ListingType> = {
    BUY_ONLY: 'buy',
    BORROW_ONLY: 'borrow',
    BUY_AND_BORROW: 'both',
  }

  return {
    id: l.listingId || l.itemId,
    itemId: l.itemId,
    title: l.title,
    author: l.author,
    edition: l.edition || '1st Edition',
    isbn: l.isbnOrCode || 'ISBN-UNKNOWN',
    category: l.subject || l.category || 'General',
    courses: [l.courseCode || 'CS101'],
    cover: l.coverImageUrl || '/covers/algorithms.png',
    value: Number(l.salePrice) || Number(l.baseItemValue) || 450,
    condition: condMap[l.bestAvailableCondition] || 'Good',
    listingType: modeMap[l.listingType] || 'both',
    storeId: resolveStoreId(l.storeId),
    available: typeof l.totalAvailableCopies === 'number' ? l.totalAvailableCopies : (typeof l.availableForSaleCount === 'number' ? l.availableForSaleCount : 1),
    addedDaysAgo: 2,
    rating: (l.reviewsCount && l.reviewsCount > 0 && l.averageRating != null) ? Number(l.averageRating) : 0,
    reviewsCount: Number(l.reviewsCount) || 0,
    storeCode: l.storeCode,
    institutionCode: l.institutionCode,
  }
}

export const getInstitution = (id: string) => {
  if (!id) return institutions[0]
  const clean = id.toLowerCase().trim()
  const found = institutions.find((i) => i.id.toLowerCase() === clean || i.domain.toLowerCase().includes(clean))
  if (found) return found
  const resolved = resolveInstitutionId({ id: clean, code: clean })
  if (resolved) {
    const byResolved = institutions.find((i) => i.id === resolved)
    if (byResolved) return byResolved
  }
  return institutions[0]
}

let liveBooksCache: Book[] = []

export function setLiveBooksCache(list: Book[]) {
  if (Array.isArray(list)) {
    liveBooksCache = list
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('unikart_live_books', JSON.stringify(list))
      } catch {}
    }
  }
}

export function registerBook(b: Book) {
  if (!b) return
  const idx = liveBooksCache.findIndex((x) => x.id === b.id)
  if (idx >= 0) liveBooksCache[idx] = b
  else liveBooksCache.push(b)
}

export const getBook = (id: string): Book => {
  if (!id) return books[0]
  // 1. Search in live cache
  const foundLive = liveBooksCache.find((b) => b.id === id || b.itemId === id)
  if (foundLive) return foundLive

  // 2. Search in static books
  const foundStatic = books.find((b) => b.id === id)
  if (foundStatic) return foundStatic

  // 3. Search in localStorage browser cache
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('unikart_live_books')
      if (stored) {
        const parsed: Book[] = JSON.parse(stored)
        const match = parsed.find((b) => b.id === id || b.itemId === id)
        if (match) {
          registerBook(match)
          return match
        }
      }
    } catch {}
  }

  return books[0]
}

/* ——— Signed-in customer (sample session) ——— */

export const currentCustomer = {
  name: 'Aryan Mehta',
  firstName: 'Aryan',
  initials: 'AM',
  email: 'aryan.20224031@mnnit.ac.in',
  role: 'Student',
  programme: 'B.Tech CSE · Semester 5',
  institutionId: 'mnnit',
  homeStoreId: 'st-mnnit',
}

export const wallet = {
  available: 1240.5,
  reserved: 200,
  pendingRefund: 445,
}

export type BorrowStatus = 'Awaiting handover' | 'Active' | 'Due soon' | 'Overdue' | 'Return requested' | 'Returned'

export interface Borrowing {
  id: string
  bookId: string
  startedOn: string
  dueOn: string
  durationDays: number
  daysLeft: number
  status: BorrowStatus
  deposit: number
  accruedFine: number
  renewable: boolean
}

export const borrowings: Borrowing[] = [
  { id: 'BR-24817', bookId: 'bk-1007', startedOn: '14 Oct', dueOn: '28 Oct', durationDays: 14, daysLeft: -3, status: 'Overdue', deposit: 445, accruedFine: 30, renewable: false },
  { id: 'BR-24902', bookId: 'bk-1002', startedOn: '9 Oct', dueOn: '2 Nov', durationDays: 30, daysLeft: 2, status: 'Due soon', deposit: 490, accruedFine: 0, renewable: true },
  { id: 'BR-25013', bookId: 'bk-1004', startedOn: '21 Oct', dueOn: '5 Dec', durationDays: 45, daysLeft: 35, status: 'Active', deposit: 360, accruedFine: 0, renewable: true },
]

export type OrderStatus = 'Ready for pickup' | 'Out for delivery' | 'Processing' | 'Delivered' | 'Cancelled' | 'Collected' | 'Fulfilled' | 'Completed'

export interface StoreOrder {
  id: string
  parentOrder: string
  storeId: string
  fulfilment: 'Self-pickup' | 'Home delivery'
  status: OrderStatus
  items: number
  total: number
  note: string
  /** Payment allocation is stored per store order so refunds can use the original method. */
  walletPaid?: number
  gatewayPaid?: number
}

export const pendingOrders: StoreOrder[] = [
  { id: 'SO-61204-A', parentOrder: 'UK-61204', storeId: 'st-mnnit', fulfilment: 'Self-pickup', status: 'Ready for pickup', items: 2, total: 1626, note: 'Pickup OTP 4821 · window closes 2 Nov, 6:00 PM' },
  { id: 'SO-61204-B', parentOrder: 'UK-61204', storeId: 'st-iitbhu', fulfilment: 'Home delivery', status: 'Out for delivery', items: 1, total: 1110, note: 'Delhivery · AWB 7731 0482 1156 · ETA today' },
]

export type TxnState = 'Completed' | 'Reserved' | 'Pending' | 'Refunded'

export interface Transaction {
  id: string
  label: string
  detail: string
  amount: number
  date: string
  state: TxnState
  kind: 'topup' | 'purchase' | 'deposit' | 'refund' | 'fine' | 'payout'
}

export const transactions: Transaction[] = [
  { id: 'TX-90812', label: 'Sell payout', detail: 'Engineering Graphics · SB-3307', amount: 310, date: 'Today, 11:42', state: 'Completed', kind: 'payout' },
  { id: 'TX-90744', label: 'Order UK-61204', detail: '2 stores · 3 items', amount: -2736, date: 'Yesterday', state: 'Completed', kind: 'purchase' },
  { id: 'TX-90730', label: 'Wallet top-up', detail: 'UPI · HDFC ••4417', amount: 3000, date: 'Yesterday', state: 'Completed', kind: 'topup' },
  { id: 'TX-90611', label: 'Deposit refund', detail: 'Engineering Physics · BR-24410', amount: 445, date: '27 Oct', state: 'Pending', kind: 'refund' },
  { id: 'TX-90588', label: 'Reserved for checkout', detail: 'Cart hold · expires in 12 min', amount: -200, date: '27 Oct', state: 'Reserved', kind: 'deposit' },
  { id: 'TX-90402', label: 'Late return fine', detail: 'Thermal Engg. · 2 days', amount: -20, date: '22 Oct', state: 'Completed', kind: 'fine' },
]

export const recommendedCourses = ['CS3201 · Operating Systems', 'CS3202 · Computer Networks', 'MA2103 · Discrete Maths']
