/**
 * Feature 1 — Post surplus food (and edit or delete it).
 *
 * This is the form the whole app depends on, so it is the one that validates
 * hardest: every field is checked on submit and again on blur, and every
 * message is a sentence a shop owner can act on at 8pm without thinking.
 */

import {
  confirmDialog, esc, field, formSummary, icon, paintErrors, toast, toastErr, toastOk,
} from '../ui.js'
import {
  CATEGORIES, DIET_TAGS, clean, localInputToMs, msToLocalInput,
  validateImageUrl, validateName, validatePhone, validatePortions, validateText,
  validateWindow,
} from '../lib/format.js'
import { PHOTO_SUGGESTIONS } from '../lib/seed.js'
import { SRI_LANKA_PLACES, findPlace } from '../lib/geo.js'
import { backend, state } from '../store.js'

/** Sensible defaults: open now, close at 8pm tonight (or in three hours). */
function defaultWindow() {
  const now = new Date()
  const start = new Date(now.getTime() + 5 * 60000)
  start.setSeconds(0, 0)
  const end = new Date(now)
  end.setHours(20, 0, 0, 0)
  if (end <= start) end.setTime(start.getTime() + 3 * 3600_000)
  return { start: start.getTime(), end: end.getTime() }
}

export function render(params) {
  const editing = Boolean(params.id)
  const { user, authReady } = state

  if (!authReady) {
    return `<div class="page view-pad" style="padding-top:8rem"><p class="small mute">Checking your account…</p></div>`
  }
  if (!user) {
    return gate(
      'Sign in to post food',
      'Only a signed-in shop can list surplus, so people know where they are collecting from.',
      '<a class="btn btn-primary" href="#/login">Sign in</a><a class="btn btn-outline" href="#/signup">Create a business account</a>',
    )
  }
  if (user.role !== 'business') {
    return gate(
      'This is the business side',
      'Your account is set up to receive food, not to post it. Create a separate business account if you also run a shop or kitchen.',
      '<a class="btn btn-primary" href="#/browse">Find food instead</a>',
    )
  }

  return `
    <header class="page-header">
      <div class="page">
        <p class="eyebrow crumb"><a href="#/business">My listings</a> <span style="opacity:.4">/</span> ${editing ? 'Edit' : 'New listing'}</p>
        <h1 class="display h-xl" style="max-width:16ch">
          ${editing ? 'Edit this' : 'Post what you'} <span class="display-it gold glow-gold">${editing ? 'listing.' : 'did not sell.'}</span>
        </h1>
        <p class="lede" style="margin-top:1.2rem">
          It takes under a minute. Be honest about the amount and the closing time —
          somebody is going to plan a trip around it.
        </p>
      </div>
    </header>

    <div class="page view-pad" style="padding-top:2rem">
      <form id="post-form" class="form-narrow" novalidate>
        <div id="form-summary"></div>
        <div class="card card-pad stack" style="gap:1.4rem;margin-top:1rem">
          <p class="eyebrow no-rule mute">The food</p>

          ${field({
            id: 'title', label: 'What is it?', required: true,
            hint: 'Name it the way you would say it across the counter.',
            control: `<input class="field" id="title" name="title" maxlength="90" placeholder="Evening bake — kimbula banis & seeni sambol buns">`,
          })}

          <div class="grid cols-2" style="gap:1.4rem">
            ${field({
              id: 'category', label: 'Category', required: true,
              control: `<select class="field" id="category" name="category">
                ${CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.label)}</option>`).join('')}
              </select>`,
            })}
            ${field({
              id: 'portions', label: 'How many portions?', required: true,
              hint: 'Roughly how many people it would feed.',
              control: `<input class="field" id="portions" name="portions" type="number" min="1" max="500" step="1" inputmode="numeric" placeholder="18">`,
            })}
          </div>

          ${field({
            id: 'description', label: 'Anything they should know',
            hint: 'How it was stored, when it was made, where to come in. Max 400 characters.',
            control: `<textarea class="field" id="description" name="description" maxlength="400" placeholder="Baked at 4pm and still soft. Ask for Fathima at the side counter and bring a bag."></textarea>`,
          })}

          <fieldset>
            <legend class="field-label" style="padding:0">Dietary notes</legend>
            <div class="row row-wrap" style="gap:.5rem">
              ${DIET_TAGS.map(
                (d) => `<label class="pill-check"><input type="checkbox" name="dietary" value="${d.id}"><span>${esc(d.label)}</span></label>`,
              ).join('')}
            </div>
          </fieldset>

          ${field({
            id: 'imageUrl', label: 'Photo link',
            hint: 'Paste any public image link — from Unsplash, Google, or your own website. There is no upload, so nothing to pay for.',
            control: `<input class="field" id="imageUrl" name="imageUrl" type="url" placeholder="https://images.unsplash.com/photo-...">`,
          })}
          <div class="row row-wrap" style="gap:.4rem;margin-top:-.6rem">
            <span class="xsmall mute" style="align-self:center">Or use a stock photo:</span>
            ${PHOTO_SUGGESTIONS.map(
              (p) => `<button type="button" class="chip" data-photo="${esc(p.url)}">${esc(p.label)}</button>`,
            ).join('')}
          </div>
          <div id="photo-preview"></div>
        </div>

        <div class="card card-pad stack" style="gap:1.4rem;margin-top:1.25rem">
          <p class="eyebrow no-rule mute">Pickup window</p>
          <div class="grid cols-2" style="gap:1.4rem">
            ${field({
              id: 'pickupStart', label: 'Can be collected from', required: true,
              control: `<input class="field" id="pickupStart" name="pickupStart" type="datetime-local">`,
            })}
            ${field({
              id: 'pickupEnd', label: 'Latest pickup time', required: true,
              hint: 'After this the listing closes automatically.',
              control: `<input class="field" id="pickupEnd" name="pickupEnd" type="datetime-local">`,
            })}
          </div>
        </div>

        <div class="card card-pad stack" style="gap:1.4rem;margin-top:1.25rem">
          <p class="eyebrow no-rule mute">Where to collect</p>
          ${field({
            id: 'businessName', label: 'Shop name', required: true,
            control: `<input class="field" id="businessName" name="businessName" maxlength="80">`,
          })}
          ${field({
            id: 'address', label: 'Street address', required: true,
            hint: 'Enough for someone to find the door.',
            control: `<input class="field" id="address" name="address" maxlength="120" placeholder="212 High Level Road, Nugegoda">`,
          })}
          <div class="grid cols-2" style="gap:1.4rem">
            ${field({
              id: 'city', label: 'Town', required: true,
              hint: 'Used to work out how far away you are.',
              control: `<select class="field" id="city" name="city">
                ${SRI_LANKA_PLACES.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}
              </select>`,
            })}
            ${field({
              id: 'businessPhone', label: 'Contact number', required: true,
              hint: 'Shown to whoever claims the food.',
              control: `<input class="field" id="businessPhone" name="businessPhone" type="tel" placeholder="0771234567">`,
            })}
          </div>
        </div>

        <div class="row row-wrap" style="gap:.7rem;margin-top:1.5rem">
          <button class="btn btn-primary btn-lg" type="submit" id="submit-btn">
            ${editing ? 'Save changes' : 'Post this food'}
          </button>
          <a class="btn btn-subtle btn-lg" href="#/business">Cancel</a>
          ${editing ? `<button class="btn btn-danger btn-lg" type="button" id="delete-btn" style="margin-left:auto">${icon('trash', 15)} Delete</button>` : ''}
        </div>
      </form>
    </div>`
}

function gate(title, body, actions) {
  return `<div class="page view-pad" style="padding-top:9rem;max-width:40rem;text-align:center">
      <p class="display h-lg">${esc(title)}</p>
      <p class="lede" style="margin:1.2rem auto 2rem">${esc(body)}</p>
      <div class="row row-wrap" style="justify-content:center;gap:.7rem">${actions}</div>
    </div>`
}

/* -------------------------------- behaviour ------------------------------- */

export function after(root, params, { navigate }) {
  const form = root.querySelector('#post-form')
  if (!form) return null

  const { user } = state
  const editing = Boolean(params.id)
  const existing = editing ? state.listings.find((l) => l.id === params.id) : null

  if (editing && !existing) {
    root.querySelector('#form-summary').innerHTML = formSummary(
      'That listing could not be found. It may have already been deleted.',
    )
  }
  if (editing && existing && existing.businessId !== user.uid) {
    navigate('/business')
    toastErr('You can only edit listings your own shop posted.')
    return null
  }

  prefill(form, existing, user)
  wirePhoto(form)

  // Validate a field as soon as the person leaves it, not only on submit.
  form.addEventListener(
    'blur',
    (e) => {
      if (!e.target.classList?.contains('field')) return
      const errors = validate(readForm(form))
      const key = e.target.name
      paintOne(form, key, errors[key])
    },
    true,
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const values = readForm(form)
    const errors = validate(values)
    root.querySelector('#form-summary').innerHTML = ''

    if (Object.keys(errors).length) {
      root.querySelector('#form-summary').innerHTML = formSummary(
        `Please fix ${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? '' : 's'} below before posting.`,
      )
      paintErrors(form, errors)
      return
    }

    const btn = form.querySelector('#submit-btn')
    btn.disabled = true
    btn.textContent = editing ? 'Saving…' : 'Posting…'

    const place = findPlace(values.city)
    const payload = {
      businessId: user.uid,
      businessName: values.businessName,
      businessPhone: values.businessPhone,
      address: values.address,
      city: values.city,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      title: values.title,
      description: values.description,
      category: values.category,
      portions: Number(values.portions),
      dietary: values.dietary,
      imageUrl: values.imageUrl,
      pickupStart: values.pickupStart,
      pickupEnd: values.pickupEnd,
    }

    try {
      if (editing) {
        await backend.updateListing(params.id, payload)
        toastOk('Listing updated.')
      } else {
        await backend.createListing(payload)
        toastOk('Posted. It is live for everyone nearby right now.')
      }
      navigate('/business')
    } catch (err) {
      btn.disabled = false
      btn.textContent = editing ? 'Save changes' : 'Post this food'
      root.querySelector('#form-summary').innerHTML = formSummary(err.message)
      toastErr(err.message)
    }
  })

  form.querySelector('#delete-btn')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete this listing?',
      body: 'It disappears from everybody’s list immediately. This cannot be undone.',
      confirmLabel: 'Delete it',
    })
    if (!ok) return
    try {
      await backend.deleteListing(params.id)
      toast('Listing deleted.', 'info')
      navigate('/business')
    } catch (err) {
      toastErr(err.message)
    }
  })

  return null
}

function prefill(form, existing, user) {
  const set = (name, value) => {
    const el = form.elements[name]
    if (el && value != null && !(el instanceof RadioNodeList)) el.value = value
  }

  if (existing) {
    set('title', existing.title)
    set('category', existing.category)
    set('portions', existing.portions)
    set('description', existing.description)
    set('imageUrl', existing.imageUrl)
    set('pickupStart', msToLocalInput(existing.pickupStart))
    set('pickupEnd', msToLocalInput(existing.pickupEnd))
    set('businessName', existing.businessName)
    set('address', existing.address)
    set('city', existing.city)
    set('businessPhone', existing.businessPhone)
    form.querySelectorAll('[name="dietary"]').forEach((cb) => {
      cb.checked = (existing.dietary || []).includes(cb.value)
    })
  } else {
    // Everything we already know about the shop, so posting is mostly typing a title.
    const w = defaultWindow()
    set('pickupStart', msToLocalInput(w.start))
    set('pickupEnd', msToLocalInput(w.end))
    set('businessName', user.orgName || user.name || '')
    set('address', user.address || '')
    set('city', user.city || 'Colombo')
    set('businessPhone', user.phone || '')
  }
  updatePreview(form)
}

function wirePhoto(form) {
  form.querySelectorAll('[data-photo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.elements.imageUrl.value = btn.dataset.photo
      updatePreview(form)
      paintOne(form, 'imageUrl', null)
    })
  })
  form.elements.imageUrl.addEventListener('input', () => updatePreview(form))
}

function updatePreview(form) {
  const url = form.elements.imageUrl.value.trim()
  const box = form.querySelector('#photo-preview')
  if (!/^https?:\/\//i.test(url)) {
    box.innerHTML = ''
    return
  }
  box.innerHTML = `<div class="card" style="max-width:20rem">
      <div class="listing-media" style="aspect-ratio:16/10">
        <img src="${esc(url)}" alt="Preview of the photo you linked"
             onerror="this.parentElement.innerHTML='<div class=&quot;fallback&quot; style=&quot;font-size:.85rem;color:var(--ink-mute);text-align:center;padding:1rem&quot;>That link did not load an image</div>'">
      </div>
    </div>`
}

function readForm(form) {
  const fd = new FormData(form)
  return {
    title: String(fd.get('title') || '').trim(),
    category: String(fd.get('category') || 'other'),
    portions: String(fd.get('portions') || ''),
    description: String(fd.get('description') || '').trim(),
    imageUrl: String(fd.get('imageUrl') || '').trim(),
    dietary: fd.getAll('dietary'),
    pickupStart: localInputToMs(fd.get('pickupStart')),
    pickupEnd: localInputToMs(fd.get('pickupEnd')),
    businessName: String(fd.get('businessName') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    city: String(fd.get('city') || '').trim(),
    businessPhone: String(fd.get('businessPhone') || '').trim(),
  }
}

function validate(v) {
  const window = validateWindow(v.pickupStart, v.pickupEnd)
  return clean({
    title: validateName(v.title, 'A name for the food'),
    portions: validatePortions(v.portions),
    description: validateText(v.description, { field: 'The description', max: 400 }),
    imageUrl: validateImageUrl(v.imageUrl),
    pickupStart: window.start,
    pickupEnd: window.end,
    businessName: validateName(v.businessName, 'Shop name'),
    address: validateName(v.address, 'Street address'),
    city: v.city ? null : 'Choose the town you are in.',
    businessPhone: validatePhone(v.businessPhone),
  })
}

function paintOne(form, key, message) {
  const wrap = form.querySelector(`[data-field="${key}"]`)
  if (!wrap) return
  const input = wrap.querySelector('.field')
  const errEl = wrap.querySelector('.field-error')
  if (message) {
    errEl.textContent = message
    errEl.hidden = false
    input?.setAttribute('aria-invalid', 'true')
  } else {
    errEl.hidden = true
    errEl.textContent = ''
    input?.removeAttribute('aria-invalid')
  }
}
