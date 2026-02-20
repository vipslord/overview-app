import React from 'react';
import ReactDOM from 'react-dom';
import Details from './components/Details';

import '@atlaskit/css-reset';

ReactDOM.render(
  <React.StrictMode>
    <div style={{ padding: 12 }}>
      <Details />
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);
