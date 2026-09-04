/**
 * Sign in and sign up.
 *
 * Real accounts only — Firebase Authentication with email and password. The
 * account type is chosen at signup and it is the only thing that changes what
 * the rest of the app offers: a business gets the posting side, a receiver gets
 * the finding-and-claiming side.
 */

import { esc, field, formSummary, icon, paintErrors, toastOk } from '../ui.js'
import {
  clean, validateEmail, validateName, validatePassword, validatePhone,
} from '../lib/format.js'
import { SRI_LANKA_PLACES, findPlace } from '../lib/geo.js'
import { backend, state } from '../store.js'

export function render(params) {
  return params.mode === 'signup' ? signupView() : loginView()
}

/* --------------------------------- sign in -------------------------------- */

function loginView() {
  return `
    <div class="page view-pad auth-page">
      <div class="auth-card">
        <p class="eyebrow">Welcome back</p>
        <h1 class="display h-lg" style="margin-top:1rem">
          Sign <span class="display-it gold glow-gold">in.</span>
        </h1>
        <p class="lede" style="margin-top:1rem">
          Sign in to claim food near you, or to post what your kitchen did not sell.
        </p>

        <form id="auth-form" novalidate class="stack" style="gap:1.2rem;margin-top:2rem">
          <div id="form-summary"></div>
          ${field({
            id: 'email', label: 'Email', required: true,
            control: `<input class="field" id="email" name="email" type="email" autocomplete="email" placeholder="you@example.lk">`,
          })}
          ${field({
            id: 'password', label: 'Password', required: true,
            control: `<input class="field" id="password" name="password" type="password" autocomplete="current-password" placeholder="Your password">`,
          })}
          <button class="btn btn-primary btn-lg btn-block" type="submit" id="submit-btn">Sign in</button>
          <p class="small dim" style="text-align:center">
            No account yet? <a class="gold" href="#/signup" style="text-decoration:underline">Create one</a>
          </p>
        </form>
      </div>
    </div>`
}

/* --------------------------------- sign up -------------------------------- */

function signupView() {
  return `
    <div class="page view-pad auth-page">
      <div class="auth-card auth-card-wide">
      <p class="eyebrow">Join ZeroBin</p>
      <h1 class="display h-lg" style="margin-top:1rem;max-width:14ch">
        Create your <span class="display-it gold glow-gold">account.</span>
      </h1>
      <p class="lede" style="margin-top:1.2rem">
        Free, and it takes about twenty seconds. Choose the side you are on — you can
        make a second account later if you are on both.
      </p>

      <form id="auth-form" novalidate class="stack" style="gap:1.2rem;margin-top:2rem">
        <div id="form-summary"></div>

        <fieldset>
          <legend class="field-label" style="padding:0">I am here to<span class="req">*</span></legend>
          <div class="role-grid">
            <label class="card card-pad role-option">
              <span class="row" style="gap:.6rem">
                <input type="radio" name="role" value="receiver" checked>
                <span class="gold">${icon('search', 16)}</span>
                <b>Collect food</b>
              </span>
              <span class="small dim" style="display:block;margin-top:.5rem;line-height:1.6">
                For a person, a family, a charity or a community kitchen.
              </span>
            </label>
            <label class="card card-pad role-option">
              <span class="row" style="gap:.6rem">
                <input type="radio" name="role" value="business">
                <span class="gold">${icon('store', 16)}</span>
                <b>Give food</b>
              </span>
              <span class="small dim" style="display:block;margin-top:.5rem;line-height:1.6">
                For a restaurant, bakery, hotel, canteen or market stall.
              </span>
            </label>
          </div>
        </fieldset>

        ${field({
          id: 'name', label: 'Your name', required: true,
          control: `<input class="field" id="name" name="name" autocomplete="name" placeholder="Nimal Perera">`,
        })}

        <div id="org-wrap" hidden>
          ${field({
            id: 'orgName', label: 'Shop or organisation name', required: true,
            hint: 'This is the name people see on your listings.',
            control: `<input class="field" id="orgName" name="orgName" placeholder="Araliya Bake House">`,
          })}
        </div>

        ${field({
          id: 'email', label: 'Email', required: true,
          control: `<input class="field" id="email" name="email" type="email" autocomplete="email" placeholder="you@example.lk">`,
        })}
        ${field({
          id: 'password', label: 'Password', required: true,
          hint: 'At least 6 characters.',
          control: `<input class="field" id="password" name="password" type="password" autocomplete="new-password" placeholder="••••••••">`,
        })}
        ${field({
          id: 'phone', label: 'Phone number', required: true,
          hint: 'So the other side can reach you about a pickup.',
          control: `<input class="field" id="phone" name="phone" type="tel" placeholder="0771234567">`,
        })}
        <div class="grid cols-2" style="gap:1.2rem">
          ${field({
            id: 'city', label: 'Town', required: true,
            control: `<select class="field" id="city" name="city">
              ${SRI_LANKA_PLACES.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}
            </select>`,
          })}
          ${field({
            id: 'address', label: 'Address',
            hint: 'Optional for collectors; required for shops.',
            control: `<input class="field" id="address" name="address" placeholder="212 High Level Road">`,
          })}
        </div>

        <button class="btn btn-primary btn-lg btn-block" type="submit" id="submit-btn">Create my account</button>
        <p class="small dim" style="text-align:center">
          Already have one? <a class="gold" href="#/login" style="text-decoration:underline">Sign in</a>
        </p>
      </form>
      </div>
    </div>`
}

/* -------------------------------- behaviour ------------------------------- */

export function after(root, params, { navigate }) {
  const form = root.querySelector('#auth-form')
  if (!form) return null
  const signup = params.mode === 'signup'
  const summary = root.querySelector('#form-summary')

  /* Shop name only applies to a business account. */
  if (signup) {
    const sync = () => {
      const isBiz = form.elements.role.value === 'business'
      root.querySelector('#org-wrap').hidden = !isBiz
    }
    form.querySelectorAll('[name="role"]').forEach((r) => r.addEventListener('change', sync))
    sync()
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    summary.innerHTML = ''
    const fd = new FormData(form)
    const v = Object.fromEntries([...fd.entries()].map(([k, val]) => [k, String(val).trim()]))

    const errors = signup
      ? clean({
          name: validateName(v.name, 'Your name'),
          orgName: v.role === 'business' ? validateName(v.orgName, 'Shop name') : null,
          email: validateEmail(v.email),
          password: validatePassword(v.password),
          phone: validatePhone(v.phone),
          address: v.role === 'business' && !v.address ? 'A shop needs an address so people can find it.' : null,
        })
      : clean({
          email: validateEmail(v.email),
          password: v.password ? null : 'Enter your password.',
        })

    if (Object.keys(errors).length) {
      paintErrors(form, errors)
      return
    }

    const btn = form.querySelector('#submit-btn')
    btn.disabled = true
    btn.textContent = signup ? 'Creating your account…' : 'Signing in…'

    try {
      if (signup) {
        const place = findPlace(v.city)
        await backend.signUp({
          email: v.email,
          password: v.password,
          role: v.role,
          name: v.name,
          orgName: v.role === 'business' ? v.orgName : '',
          phone: v.phone,
          address: v.address || '',
          city: v.city,
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
        })
        toastOk('Account created. Welcome to ZeroBin.')
        navigate(v.role === 'business' ? '/business' : '/browse')
      } else {
        const profile = await backend.signIn(v.email, v.password)
        toastOk(`Signed in as ${profile.orgName || profile.name || profile.email}.`)
        navigate(profile.role === 'business' ? '/business' : '/browse')
      }
    } catch (err) {
      btn.disabled = false
      btn.textContent = signup ? 'Create my account' : 'Sign in'
      summary.innerHTML = formSummary(err.message)
    }
  })

  return null
}
