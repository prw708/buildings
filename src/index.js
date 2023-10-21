import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
const username = document.getElementById('root').getAttribute('data-username');
const admin = document.getElementById('root').getAttribute('data-admin') === 'true';
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
const time = document.querySelector('meta[name="time-of-load"]').getAttribute('content');
const recaptchaSiteKey = document.getElementById('root').getAttribute('data-recaptchaSiteKey');
root.render(
  <React.StrictMode>
    <App 
      username={username}
      admin={admin}
      csrfToken={csrfToken}
      time={time}
      recaptchaSiteKey={recaptchaSiteKey}
    />
  </React.StrictMode>
);

