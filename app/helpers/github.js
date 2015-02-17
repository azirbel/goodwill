import icAjax from 'ic-ajax';

// Creates an authenticated or unauthenticated request depending on whether
// the token was passed in or not
function ajax(url, token = null) {
  if (!token) {
    return icAjax(url);
  } else {
    return icAjax({
      url: url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'token ' + token
      }
    });
  }
}

export default { ajax };
