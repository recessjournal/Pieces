var events = [];
var errors = [];
var vid = '';
var loopVideos = false;
var shuffleCount = 0;
var activePlayer = 'myythtml5player';
var playerType = 'embedded';
var playerVersion = 'html5';
var as3ContentTypes = ['video:a video', 'videolist:a list of videos',
    'playlist:a playlist', 'user_uploads:uploaded videos',
    'user_favorites:favorite videos', 'search:search results'];
var as2ContentTypes = ['video:a video'];
var flashPlayerTypes = ['embedded:embedded player',
    'chromeless:chromeless player'];
var contentTypeLabel = {
  'video': 'with video ID',
  'videolist': ' with video IDs',
  'playlist': 'with playlist ID',
  'user_uploads': 'for YouTube user',
  'user_favorites': 'for YouTube user',
  'search': 'for the query'
};
var contentType = 'video'
var playerContent = 'M7lc1UVf-VE';
var html5PlayerTypes = ['embedded:embedded player'];
var player;
var flashPlayer;
var html5Player;
var iframeCount = 1;
var playerParams = '';
var html5PlayerParams = '';
var as2Options = {'border': 1, 'color1': 1, 'color2': 1, 'disablekb': 1,
    'egm': 1, 'hd': 1, 'showsearch': 1};
var as3Options = {'controls': 1, 'playlist': 1};

// Define quality options for validating form inputs
var qualityLevels = {'default': 1, 'highres': 1, 'hd1080': 1, 'hd720': 1,
    'large': 1, 'medium': 1, 'small': 1};

// Let demo users preview color settings of embedded player
var colorRegex = /\#?[0-9A-Fa-f]{6}/;

/**
 * The 'redrawPlayer' function builds the SWF URL based on the selected video
 * and other parameters that the user may have selected. It also redraws the
 * player on the page.
 * @return {string} The SWF URL for the video player.
 */
function redrawPlayer() {
  // Redraw player if any of:
  //     (1) switching embedded<=>chromeless
  //     (2) switching AS3<=>AS2
  //     (3) changing player params
  // Otherwise, we can call a function like cueVideoById.
  // Note: if the player params have changed and they're changing back to the
  // same parameters already used in the IFrame player, and the player version
  // is also switching to the iframe player, then there's no need to redraw.
  var funkyIframeRule = false;
  var updatePlayer = false;
  var currentPlayerParams = getEmbeddedPlayerOptions('');
  if (document.getElementById('playerVersion').value == 'html5' &&
      currentPlayerParams == html5PlayerParams) {
    funkyIframeRule = true;
  }
  if (funkyIframeRule ||
      playerType != document.getElementById('playerType').value ||
      playerVersion != document.getElementById('playerVersion').value ||
      currentPlayerParams != playerParams) {
    if (playerVersion == 'html5') {
      html5PlayerParams = playerParams;
    }
    updatePlayer = (funkyIframeRule) ? false : true;
  }

  playerParams = currentPlayerParams;
  playerType = document.getElementById('playerType').value;
  playerVersion = document.getElementById('playerVersion').value;
  contentType = document.getElementById('contentType').value;
  playerContent = document.getElementById('playerContent').value;
  if (!sanitizePlayerContentInput(contentType, playerContent)) {
    // TODO: Set error message that will be more visible?
    return false;
  }

  // Update the 'vid' variable to reflect specified content.
  setVideoId();

  // If the user has selected a video list, build an array of videos, which
  // would be used to call a function, and build a parameter value, which
  // would be used to load a new player with the specified content.
  var videoList = '';
  var videos = [];
  if (contentType == 'videolist') {
    var videoListArray = playerContent.split(',');
    for (listItem = 0; listItem < videoListArray.length; listItem++) {
      videos.push(videoListArray[listItem]);
      if (listItem > 0) {
        videoList += videoListArray[listItem] + ',';
      }
    }
  }

  if (!updatePlayer) {
    // Set the 'player' variable to refer to either the IFrame or Flash player.
    // So, when we call player.playVideo, the right player will play.
    // Show the appropriate player and hide the other.
    if (playerVersion == 'html5') {
      player = html5Player;
      showIframePlayer();
    } else {
      player = flashPlayer;
      showFlashPlayer();
    }
    // Call a function to load the requested content (video, playlist, etc.)
    var queueingOption = document.getElementById('queueingOption').value;
    var startIndex = '0';
    var startTime = document.getElementById('startseconds').value;
    var startQuality = document.getElementById('startquality').value;
    if (contentType == 'video' && queueingOption == 'load') {
      loadVideo(vid, startTime, startQuality);
    } else if (contentType == 'video' && queueingOption == 'cue') {
      cueVideo(vid, startTime, startQuality);
    } else if (contentType == 'videolist' && queueingOption == 'load') {
      loadListArray(videos, startIndex, startTime, startQuality);
    } else if (contentType == 'videolist' && queueingOption == 'cue') {
      cueListArray(videos, startIndex, startTime, startQuality);
    } else if (queueingOption == 'load') {
      loadList(contentType, playerContent, startIndex, startTime,
          startQuality);
    } else if (queueingOption == 'cue') {
      cueList(contentType, playerContent, startIndex, startTime,
          startQuality);
    }
  } else {
    // Stop the player and clear logs if the user is creating a new player.
    stop();
    clearOutput();
    // Get the player base URL, which includes the API version and the
    // selected video content.
    var playerUrl = constructPlayerUrl(contentType, playerContent);
    if (playerType == 'embedded') {
      // Set the user's player options to reflect actual selections
      // since we need to change playerapiid to the id of the player
      // embedded on this page and also always want to enable the JS
      // API for the player on this page.
      userPlayerOptions = currentPlayerParams;
      currentPlayerParams.replace(/\&?playerapiid=([^\W]+)/g, '');

      // If the user is loading a video list, the first video in the list
      // is in the URL path, and the remaining videos are in the playlist param.
      if (contentType == 'videolist') {
        currentPlayerParams += '&playlist=' + videoList.substr(0,
            (videoList.length - 1));
      } else if (contentType != 'video') {
        currentPlayerParams += '&listType=' + contentType + '&list=' +
            playerContent;
      }

      // TODO: Set start param based on startseconds value? Overkill?
      // var startTime = document.getElementById('startseconds').value;

      playerUrl += currentPlayerParams;
    }

    // Add options to player.
    playerUrl += '&origin=https://developers.google.com' +
        '&enablejsapi=1&playerapiid=';

    // Replace existing player with new one reflecting specified options.
    if (playerVersion == 'html5') {
      newHtml5DivId = 'myythtml5player' + iframeCount;
      iframeCount++;
      playerUrl += newHtml5DivId;
      var playerData = getPlayerVideoAndParams(playerUrl);
      var playerVideo = playerData[0];
      var playerVars = playerData[1];
      // Remove old player and create a new one.
      html5Node = document.getElementById('html5player-wrapper');
      if (html5Node) {
        while (html5Node.hasChildNodes()) {
          html5Node.removeChild(html5Node.firstChild);
        }
      }
      newHtml5Div = document.createElement('div');

      newHtml5Div.id = newHtml5DivId;
      html5Node.appendChild(newHtml5Div);
      createYTPlayer(newHtml5DivId, '360', '640', playerVideo, playerVars);
      showIframePlayer();
    } else {
      activePlayer = 'myytflashplayer';
      playerUrl += activePlayer;
      showFlashPlayer();
      player = flashPlayer;
      var myytplayer = document.getElementById(activePlayer);
      if (myytplayer) {
        myytplayer.width = '640';
        myytplayer.height = '360';
        myytplayer.data = playerUrl;
      }
    }
    if (playerVersion != 'as2') {
      getEmbedCode();
    }
  }

  // Show/hide playlist functions when switching to AS3/AS2
  playlistOnlyElements = ['playlist-position-options', 'playlist-statistics'];
  for (count = 0; count < playlistOnlyElements.length; count++) {
    var element = document.getElementById(playlistOnlyElements[count]);
    element.style.display = (contentType == 'video' || playerVersion == 'as2') ?
        'none' :
        'block';
  }

  // Show/hide playback rate when switching to AS3/AS2
  playbackRateElements = ['playbackrate-options', 'playbackrate-statistics'];
  for (count = 0; count < playbackRateElements.length; count++) {
    var element = document.getElementById(playbackRateElements[count]);
    element.style.display = (playerVersion == 'as2') ? 'none' : 'block';
  }

  // Show/hide getVideoLoadedFraction function when switching to AS2
  percentLoadedElem= document.getElementById('percent-video-loaded');
  percentLoadedElem.style.display = (playerVersion == 'as2') ? 'none' : 'block';
}

/**
 * The 'getEmbeddedPlayerOptions' function retrieves the player parameters
 * that the user has selected and builds a parameter string.
 * @return {string} The selected options.
 */
function getEmbeddedPlayerOptions() {
  var parent = document.getElementById('embedded-player-options');
  var inputs = parent.getElementsByTagName('input');
  var selects = parent.getElementsByTagName('select');

  // First character in arguments should be '?' unless URL already
  // contains parameters, in which case, it should be '&'. It seems
  // like when you refresh the AS2 player, it already has the
  // hl=en_US and feature=player_embedded parameters set.
  var argString = '&';

  // Construct arg string based on values of player params in form.
  // Do not include parameter in string if it's set to default value.
  for (var i = 0, input; input = inputs[i]; i++) {
    var value = input.value;
    var name = input.id.replace(/embedded\-player\-/, '');
    // Skip AS2-only parameters when user is testing AS3 options,
    // and skip AS3-only parameters when user is testing AS2 options.
    if ((playerVersion != 'as2' && as2Options[name]) ||
        (playerVersion == 'as2' && as3Options[name])) {
      continue;
    }
    // XSS sanitizer -- make sure player height/width are numbers.
    if (name == 'color1' || name == 'color2') {
      value = '0x' + value;
    } else if (name == 'rel' || name == 'showsearch' || name == 'showinfo' ||
        name == 'controls') {
      if (input.checked) {
        continue;
      }
      value = '0';
    } else if (value == 'on' && input.checked) {
      value = '1';
    // XSS sanitizer -- make sure playerapiid, playlist, and start
    // parameters all contain valid values.
    } else if (name == 'playerapiid' &&
        (!value || !xssSanitizer('playerapiid', value, 'alphanumeric'))) {
      continue;
    } else if (name == 'playlist' &&
        (!value || !xssSanitizer('playlist', value, 'playlist'))) {
      continue;
    } else if (name == 'start' &&
        (!value || !xssSanitizer('start', value, 'digits'))) {
      continue;
    } else {
      continue;
    }
    argString += name + '=' + value + '&';
  }
  for (var s = 0, select; select = selects[s]; s++) {
    var value = select.value;
    var name = select.id.replace(/embedded\-player\-/, '');
    if ((name == 'iv_load_policy' && value != '1') ||
        (name == 'autohide' && value != '') ||
        (name == 'color' && value != 'red') ||
        (name == 'theme' && value != 'dark')) {
      argString += name + '=' + value + '&';
    }
  }
  argString = argString.substring(0, argString.length - 1);
  return argString;
}

/**
 * The 'setVideoId' function identifies the type of content that the user has
 * selected for the player to play and sets the 'vid' variable, which is used
 * in the embedded player URL to identify a video ID for the desired content.
 */
function setVideoId() {
  if (contentType == 'video' || playerVersion == 'as2') {
    vid = (playerContent == '') ? 'M7lc1UVf-VE' : playerContent;
  } else if (contentType == 'videolist') {
    var videoListArray = playerContent.split(',');
    vid = videoListArray[0];
  } else {
    vid = 'videoseries';
  }
}

/**
 * The 'constructPlayerUrl' function builds the SWF URL based on the
 * selected video and other parameters that the user may have selected.
 * It also redraws the player on the page.
 * @param {string} contentType Mandatory Value could be video, videolist,
 *     playlist, user_uploads, user_favorites, search.
 * @param {string} playerContent Mandatory In conjunction with the
 *     contentType value, this identifies the content the player will
 *     load. Value could be a video ID, playlist ID, username, etc.
 * @return {string} The base URL + player content for the video player.
 */
function constructPlayerUrl(contentType, playerContent) {
  // Choose correct URL format:
  // AS3 embedded: http://www.youtube.com/e/VIDEO_ID?version=3&args
  // AS3 chromeless:
  //     http://www.youtube.com/apiplayer?video_id=VIDEO_ID&version=3&args
  // AS2 embedded: http://youtube.googleapis.com/v/VIDEO_ID?version=2&args
  // AS2 chromeless:
  //     http://youtube.googleapis.com/apiplayer?video_id=VIDEO_ID \
  //     &version=2&args

  var baseUrl = 'https://www.youtube.com/';
  if (playerVersion == 'as2') {
    baseUrl = 'https://youtube.googleapis.com/';
  }
  if (playerType == 'chromeless') {
    baseUrl += 'apiplayer?';
    baseUrl = (contentType == 'video' || contentType == 'videolist') ?
        baseUrl + 'video_id=' + vid :
        baseUrl + 'listType=' + contentType + '&list=' + playerContent;
  } else {
    baseUrl += 'v/' + vid;
  }

  // Add version parameter to URL.
  baseUrl = (playerType == 'embedded') ?
      baseUrl + '?' :
      baseUrl + '&';

  baseUrl = (playerVersion == 'as2') ?
      baseUrl + 'version=2' :
      baseUrl + 'version=3';

  return baseUrl;
}

/**
 * The 'getPlayerVideoAndParams' function takes the player URL that would
 * be set for an HTML5 player, parses out the vars -- hence, playerVars --
 * and returns an object that can then be passed to the constructor
 * for the new HTML5 player.
 * @param {string} playerUrl Mandatory The URL for the IFrame player.
 * @return {Array} Array of video ID (or 'videoseries') and player params.
 */
function getPlayerVideoAndParams(playerUrl) {
  var playerVars = {};
  var playerUrlArray = playerUrl.split('?');
  var playerUrlVideo = playerUrlArray[0].split('/').pop();
  if (playerUrlArray[1]) {
    var playerUrlParams = playerUrlArray[1].split('&');
    for (param = 0; param < playerUrlParams.length; param++) {
      var keyValueArray = playerUrlParams[param].split('=');
      var playerKey = keyValueArray[0];
      var playerValue = '';
      if (keyValueArray.length > 1) {
        playerValue = keyValueArray[1];
      }
      playerVars[playerKey] = playerValue;
    }
  }
  return [playerUrlVideo, playerVars];
}

/**
 * The 'showIframePlayer' function shows the IFrame player and hides the
 *     Flash player.
 */
function showIframePlayer() {
  document.getElementById('html5player-wrapper').style.display = '';
  document.getElementById('flashplayer-wrapper').style.display = 'none';
}

/**
 * The 'showFlashPlayer' function shows the Flash player and hides the
 *     iframe player.
 */
function showFlashPlayer() {
  document.getElementById('html5player-wrapper').style.display = 'none';
  document.getElementById('flashplayer-wrapper').style.display = '';
}

/**
 * The switchEmbedCode function shows or hides the <iframe> or <object>
 * embed code based on the user clicking on the corresponding tab in the UI.
 * @param {Object} embedOption Mandatory The DOM element that was clicked.
 */
function switchEmbedCode(embedOption) {
  var embedOptionId = embedOption.id;
  if (embedOptionId && embedOptionId == 'iframe-embed-code-header') {
    document.getElementById('object-embed-code').style.display = 'none';
    document.getElementById('iframe-embed-code').style.display = 'block';
    document.getElementById('object-embed-code-header').className =
        'kd-tabbutton';
    document.getElementById('iframe-embed-code-header').className =
        'selected kd-tabbutton';
  } else {
    document.getElementById('iframe-embed-code').style.display = 'none';
    document.getElementById('object-embed-code').style.display = 'block';
    document.getElementById('object-embed-code-header').className =
        'selected kd-tabbutton';
    document.getElementById('iframe-embed-code-header').className =
        'kd-tabbutton';
  }
}

/**
 * The 'updateContentTypes' function modifies text/labels in the
 * player demo so they make sense based on the content that the user
 * has selected to play. Also update options to display the ones for
 * videos if the user has selected a video or for list content if the
 * user selected that.
 */
function updateContentTypes() {
  var selectedVersion = document.getElementById('playerVersion').value;

  // Update select menu to display only 'embedded' or 'embedded/chromeless.'
  var playerTypeNode = document.getElementById('playerType');
  while (playerTypeNode.hasChildNodes()) {
    playerTypeNode.removeChild(playerTypeNode.firstChild);
  }
  var playerTypes = (selectedVersion == 'html5') ?
      html5PlayerTypes : flashPlayerTypes;
  for (var typeCount = 0; typeCount < playerTypes.length; typeCount++) {
    var optionInfoArray = playerTypes[typeCount].split(':');
    var optionTypeNode = document.createElement('option');
    optionTypeNode.value = optionInfoArray[0];
    optionTypeNode.innerHTML = optionInfoArray[1];
    playerTypeNode.appendChild(optionTypeNode);
  }

  // Update content types user can select from. The options might change if
  // (a) user is switching to AS2 player (only video is available), or
  // (b) selected option is 'video' meaning user may be switching from AS2.
  contentType = document.getElementById('contentType').value;
  var types = (selectedVersion == 'as2') ? as2ContentTypes : as3ContentTypes;
  if (selectedVersion == 'as2' || contentType == 'video') {
    selectTypeNode = document.getElementById('contentType');
    while (selectTypeNode.hasChildNodes()) {
      selectTypeNode.removeChild(selectTypeNode.firstChild);
    }
    for (typeCount = 0; typeCount < types.length; typeCount++) {
      var optionInfoArray = types[typeCount].split(':');
      var optionTypeNode = document.createElement('option');
      optionTypeNode.value = optionInfoArray[0];
      optionTypeNode.innerHTML = optionInfoArray[1];
      selectTypeNode.appendChild(optionTypeNode);
    }
  }
  // Update text to reflect that only a video may be loaded/cued with AS2.
  if (selectedVersion == 'as2') {
    updateContentOptions();
  }
}

/**
 * The 'updateContentOptions' function modifies text/labels in the
 * player demo so they make sense based on the type of content the user
 * has selected to play. Also update options to display the ones for
 * videos if the user has selected a video or for list content if the
 * user selected that.
 */
function updateContentOptions() {
  var contentTypeLabelNode = document.getElementById('contentTypeLabel');
  contentType = document.getElementById('contentType').value;
  if (contentTypeLabelNode && contentTypeLabel[contentType]) {
    contentTypeLabelNode.innerHTML = contentTypeLabel[contentType];
  }
}

/**
 * The 'updateColor' function checks the value of a text field to
 * determine whether its value is a hexadecimal color. If so, it updates
 * an element with a specific ID (the text field's ID + '-preview') so
 * that it's background is the color, enabling the user to preview the
 * color setting.
 * @param {Object} box Mandatory The object where the color is entered.
 */
function updateColor(box) {
  var colorValue = box.value;
  var result = colorRegex.exec(colorValue);
  if (result != null && colorValue.length == 6 &&
    document.getElementById(box.id + '-preview')) {
    colorValue = '#' + colorValue;
    document.getElementById(box.id + '-preview').style.backgroundColor =
        colorValue;
  }
}

/**
 * The 'updateHTML' function updates the innerHTML of an element.
 * @param {string} elmId Mandatory The element to update HTML for.
 * @param {string} value Mandatory The updated HTML for the element.
 */
function updateHTML(elmId, value) {
  if (document.getElementById(elmId)) {
    document.getElementById(elmId).innerHTML = value;
  }
}

/**
 * The 'addInformation' function pushes data onto the events array, then calls
 * getVideoUrl() and getEmbedCode(), a sequence is common to several functions.
 * @param {string} opt_eventData Optional The event to log.
 */
function addInformation(opt_eventData) {
  if (opt_eventData) {
    events.push(opt_eventData);
  }
  getVideoUrl();
  getEmbedCode();
}

/**
 * The 'clearOutput' removes any HTML in a few page elements and resets
 * the events[] and errors[] arrays.
 */
function clearOutput() {
  updateHTML('errorCode', 'None yet.');
  updateHTML('videoUrl', '');
  updateHTML('eventhistory', 'None yet.');
  updateHTML('object-embed-code', '');
  events = [];
  errors = [];
}

/**
 * The 'createYTPlayer' function embeds an <iframe> player.
 * @param {string} playerDiv Mandatory The DOM ID for the div where the
 *     <iframe> will be embedded.
 * @param {string} playerHeight Mandatory The height of the embedded player.
 * @param {string} playerWidth Mandatory The width of the embedded player.
 * @param {string} playerVideoId Mandatory The video ID to embed.
 * @param {Object} playerVars Mandatory Player parameters or {}.
 */
function createYTPlayer(playerDiv, playerHeight, playerWidth, playerVideoId,
    playerVars) {
  var newPlayer = new YT.Player(playerDiv, {
    height: playerHeight,
    width: playerWidth,
    videoId: playerVideoId,
    playerVars: playerVars,
    events: {
      'onError': onPlayerError,
      'onPlaybackQualityChange': onytplayerQualityChange,
      'onPlaybackRateChange': onytplayerPlaybackRateChange,
      'onReady': onYouTubeHTML5PlayerReady,
      'onStateChange': onytplayerStateChange
    }
  });
}

/**
  EVENT HANDLERS
 */

/**
 * The 'onYouTubePlayerReady' function executes when the onReady event
 * fires, indicating that the player is loaded, initialized and ready
 * to receive API calls.
 * @param {Object} event Mandatory A value that identifies the player.
 */
function onYouTubeHTML5PlayerReady(event) {
  // No need to do any of this stuff if the function was called because
  // the user customized the player parameters for the embedded player.
  if (event) {
    html5Player = event.target;
    if (html5Player && playerVersion == 'html5') {
      player = html5Player;
      // Ensure that a video is cued if using chromeless player.
      if (vid && playerType == 'chromeless') {
        cueVideo(vid, 0);
      }
      setInterval(updateytplayerInfo, 600);
      addInformation();
      updateytplayerInfo();
    }
  }
}

function onYouTubePlayerAPIReady() {
  createYTPlayer('myythtml5player', '360', '640', 'M7lc1UVf-VE', {});
}

/**
 * The 'onYouTubePlayerReady' function executes when the onReady event fires,
 * indicating that the player is loaded, initialized and ready to receive API
 * calls.
 * @param {string} playerId Mandatory A value that identifies the player.
 */
function onYouTubePlayerReady(playerId) {
  // No need to do any of this stuff if the function was called because the
  // user customized the player parameters for the embedded player.
  if (playerId && playerId != 'undefined') {
    flashPlayer = document.getElementById('myytflashplayer');
    if (flashPlayer) {
      flashPlayer.addEventListener('onStateChange', 'onytplayerStateChange');
      flashPlayer.addEventListener('onError', 'onPlayerError');
      flashPlayer.addEventListener('onPlaybackQualityChange',
          'onytplayerQualityChange');
      if (playerVersion != 'html5') {
        player = flashPlayer;
        // This ensures that a video is cued if using chromeless player.
        if (vid && playerType == 'chromeless') {
          cueVideo(vid, 0);
        }
        setInterval(updateytplayerInfo, 600);
        addInformation();
        updateytplayerInfo();
      }
    }
  }
}

/**
 * The 'onytplayerStateChange' function executes when the onStateChange
 * event fires. It captures the new player state and updates the
 * "Player state" displayed in the "Playback statistics".
 * @param {string|Object} newState Mandatory The new player state.
 */
function onytplayerStateChange(newState) {
  if (typeof newState == 'object' && newState['data']) {
    newState = newState['data'];
  }
  events.push('onStateChange event: Player state changed to: "' +
      newState + '" (' + getPlayerState(newState) + ')');
  updateHTML('playerstate', newState);
}

/**
 * The 'onPlayerError' function executes when the onError event fires.
 * It captures the error and adds it to an array that is displayed in
 * the "Errors" section of the demo.
 * @param {string} errorCode Mandatory A code that explains the error.
 */
function onPlayerError(errorCode) {
  if (typeof errorCode == 'object' && errorCode['data']) {
    errorCode = errorCode['data'];
  }
  errors.push('Error: ' + errorCode);
}

/**
 * The 'onytplayerQualityChange' function executes when the
 * onPlaybackQualityChange event fires. It captures the new playback quality
 * and updates the "Quality level" displayed in the "Playback Statistics".
 * @param {string|Object} newQuality Mandatory The new playback quality.
 */
function onytplayerQualityChange(newQuality) {
  if (typeof newQuality == 'object' && newQuality['data']) {
    newQuality = newQuality['data'];
  }
  events.push('onPlaybackQualityChange event: ' +
      'Playback quality changed to "' + newQuality + '"');
}

/**
 * The 'onytplayerPlaybackRateChange' function executes when the
 * onPlaybackRateChange event fires. It captures the new playback rate
 * and updates the "Plabyack rate" displayed in the "Playback Statistics".
 * @param {string|Object} newRate Mandatory The new playback rate.
 */
function onytplayerPlaybackRateChange(newRate) {
  if (typeof newRate == 'object' && newRate['data']) {
    newRate = newRate['data'];
  }
  events.push('onPlaybackRateChange event: ' +
      'Playback rate changed to "' + newRate + '"');
}

/**
 * PLAYER FUNCTION CALLS
 * All of the player function calls are documented at either:
 * http://code.google.com/apis/youtube/flash_api_reference.html
 * http://code.google.com/apis/youtube/iframe_api_reference.html
 * http://code.google.com/apis/youtube/flash_api_reference_as2.html
 *
 * You can navigate directly to a description of each function by
 * appending the function name, as an anchor link, to the URL above.
 * For example, the two URLs below would be used to link to the "mute"
 * and "playVideo" functions, respectively:
 * http://code.google.com/apis/youtube/flash_api_reference.html#mute
 * http://code.google.com/apis/youtube/flash_api_reference.html#playVideo
 */

/**
 * The 'cueVideo' function determines whether the user is trying to
 * cue a video by its video ID or its URL and then calls the appropriate
 * function to actually cue the video. After cueing the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} idOrUrl Mandatory The ID or URL for the video to cue.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 * @param {string} quality Optional The suggested playback quality for
 *     the video. See documentation for the setPlaybackQuality function
 *     for more information.
 */
function cueVideo(idOrUrl, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Video ID or URL', idOrUrl, 'videoIdOrUrl') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    var urlRegex = /http\:/;
    if (idOrUrl.match(urlRegex)) {
      player.cueVideoByUrl(idOrUrl, parseInt(startSeconds), quality);
      addInformation('cueVideoByUrl(' + idOrUrl +
          ', parseInt(' + startSeconds + '), ' + quality + ');');
    } else {
      player.cueVideoById(idOrUrl, parseInt(startSeconds), quality);
      addInformation('cueVideoById(' + idOrUrl +
          ', parseInt(' + startSeconds + '), ' + quality + ');');
    }
  }
}

/**
 * The 'loadVideo' function determines whether the user is trying to
 * load a video by its video ID or its URL and then calls the appropriate
 * function to actually load the video. After loading the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} idOrUrl Mandatory The ID or URL for the video to load.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 * @param {string} quality Optional The suggested playback quality for
 *     the video. See documentation for the setPlaybackQuality function
 *     for more information.
 */
function loadVideo(idOrUrl, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Video ID or URL', idOrUrl, 'videoIdOrUrl') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    var urlRegex = /http\:/;
    if (idOrUrl.match(urlRegex)) {
      player.loadVideoByUrl(idOrUrl, parseInt(startSeconds), quality);
      addInformation('loadVideoByUrl(' + idOrUrl +
          ', parseInt(' + startSeconds + '), ' + quality + ');');
    } else {
      player.loadVideoById(idOrUrl, parseInt(startSeconds), quality);
      addInformation('loadVideoById(' + idOrUrl +
          ', parseInt(' + startSeconds + '), ' + quality + ');');
    }
  }
}

/**
 * The 'cueListArray' function determines whether the user is trying to
 * cue a video by its video ID or its URL and then calls the appropriate
 * function to actually cue the video. After cueing the video, this
 * function updates the video URL and embed code for the video.
 * @param {string} videoList Mandatory List of video IDs to load/cue.
 * @param {string} startIndex Mandatory First video in set to play.
 * @param {number} startSeconds Optional The time offset, measured in
 *     seconds from the beginning of the video, from which the video
 *     should start playing.
 * @param {string} quality Optional The suggested playback quality for
 *     the video. See documentation for the setPlaybackQuality function
 *     for more information.
 */
function cueListArray(videoList, startIndex, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Start index', startIndex, 'digits') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    player.cuePlaylist(videoList, parseInt(startIndex),
        parseInt(startSeconds), quality);
    addInformation('cuePlaylist([\'' + videoList.join('\',\'') + '\'], ' +
        startIndex + ', parseInt(' + startSeconds + '), ' + quality + ');');
  }
}

/**
 * The 'loadListArray' function loads a list of videos specified by
 * their video ID, calling the loadPlaylist function and using that
 * function's argument syntax.
 * @param {string} videoList Mandatory Array of video IDs.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 * @param {string} quality Optional See loadVideo function.
 */
function loadListArray(videoList, startIndex, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Start index', startIndex, 'digits') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    player.loadPlaylist(videoList, parseInt(startIndex),
        parseInt(startSeconds), quality);
    addInformation('loadPlaylist([\'' + videoList.join('\',\'') + '\'], ' +
        startIndex + ', parseInt(' + startSeconds + '), ' + quality + ');');
  }
}

/**
 * The 'cueList' function loads a list of videos, which could be a
 * playlist, list of user uploads, list of user favorites, or set of
 * search results. It calls the cuePlaylist function and uses that
 * function's object syntax.
 * @param {string} listType Mandatory Type of list to cue.
 * @param {string} list Mandatory Combines with listType to identify list.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 * @param {string} quality Optional See loadVideo function.
 */
function cueList(listType, list, startIndex, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Start index', startIndex, 'digits') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    player.cuePlaylist({'listType': listType, 'list': list,
                        'index': startIndex,
                        'startSeconds': parseInt(startSeconds),
                        'suggestedQuality': quality});
    addInformation('cuePlaylist({\'listType\': \'' + listType + '\', \'' +
        '\'list\': \'' + list + '\',\'index\': \'' + startIndex + '\',' +
        '\'startSeconds\': \'' + startSeconds + '\',' +
        '\'suggestedQuality\': \'' + quality + '\'});');
  }
}

/**
 * The 'loadList' function loads a list of videos, which could be a
 * playlist, list of user uploads, list of user favorites, or set of
 * search results. It calls the loadPlaylist function and uses that
 * function's object syntax.
 * @param {string} listType Mandatory Type of list to load.
 * @param {string} list Mandatory Combines with listType to identify list.
 * @param {number} startIndex Optional First video to play in array.
 * @param {number} startSeconds Optional See loadVideo function.
 * @param {string} quality Optional See loadVideo function.
 */
function loadList(listType, list, startIndex, startSeconds, quality) {
  // XSS sanitizer -- make sure params contain valid values
  if (xssSanitizer('Start index', startIndex, 'digits') &&
      xssSanitizer('Start at', startSeconds, 'digits') &&
      xssSanitizer('Suggested quality', quality, 'qualitylevels')) {
    player.loadPlaylist({'listType': listType, 'list': list,
                        'index': startIndex,
                        'startSeconds': parseInt(startSeconds),
                        'suggestedQuality': quality});
    addInformation('loadPlaylist({\'listType\': \'' + listType + '\', \'' +
        '\'list\': \'' + list + '\',\'index\': \'' + startIndex + '\',' +
        '\'startSeconds\': \'' + startSeconds + '\',' +
        '\'suggestedQuality\': \'' + quality + '\'});');
  }
}

// Playback controls and player settings
/**
 * The 'play' function plays the currently cued/loaded video. It calls
 * player.playVideo().
 */
function play() {
  events.push('playVideo();');
  player.playVideo();
}

/**
 * The 'pause' function pauses the currently cued/loaded video. It calls
 * player.pauseVideo().
 */
function pause() {
  events.push('pauseVideo();');
  player.pauseVideo();
}

/**
 * The 'stop' function stops the currently cued/loaded video. It also
 * closes the NetStream object and cancels loading of the video. It calls
 * player.stopVideo().
 */
function stop() {
  events.push('stopVideo();');
  player.stopVideo();
}

/**
 * The 'seekTo' function seeks to the specified time of the video. The
 * time is specified as an offest, measured in seconds from the beginning
 * of the video. The function causes the player to find the closest
 * keyframe before the specified value.
 * @param {number} seconds Mandatory The time offset to skip to.
 * @param {boolean} allowSeekAhead Mandatory A flag that indicates if
 *     the player will make a new request to the server if the
 *     specified time is beyond the currently loaded video data.
 */
function seekTo(seconds, allowSeekAhead) {
  // XSS sanitizer -- make sure param contains a valid value
  if (xssSanitizer('Seek to', seconds, 'digits')) {
    events.push('seekTo(' + seconds + ', ' + allowSeekAhead + ');');
    player.seekTo(seconds, allowSeekAhead);
    document.getElementById('embedded-player-start').value = seconds;
  }
}

// Playing a video in a playlist

/**
 * The 'nextVideo' function plays the next video in a playlist.
 * It calls player.nextVideo().
 */
function nextVideo() {
  events.push('nextVideo();');
  player.nextVideo();
}

/**
 * The 'previousVideo' function plays the previous video in a playlist.
 * It calls player.previousVideo().
 */
function previousVideo() {
  events.push('previousVideo();');
  player.previousVideo();
}

/**
 * The 'playVideoAt' function seeks to a video at the specified playlist index.
 * @param {number} index Mandatory The playlist index of the video.
 */
function playVideoAt(index) {
  // XSS sanitizer -- make sure param contains a valid value
  if (xssSanitizer('Playlist index number', index, 'digits')) {
    events.push('playVideoAt(' + index + ');');
    player.playVideoAt(index);
  }
}

// Setting playback behavior for playlists
/**
 * The 'setLoop' function indicates whether videos should play in a loop.
 */
function setLoop() {
  loopVideos = loopVideos ? false : true;
  events.push('setLoop(' + loopVideos + ');');
  // Update UI to reflect correct looping status.
  document.getElementById('player-loop-status').innerHTML =
    loopVideos ? 'on' : 'off';
  document.getElementById('player-loop-link').innerHTML =
    loopVideos ? 'turn off' : 'turn on';
  document.getElementById('embedded-player-loop').checked =
    loopVideos ? true : false;
  player.setLoop(loopVideos);
}

/**
 * The 'setShuffle' function indicates whether videos should be shuffled.
 * If videos are already shuffled and parameter is true, videos will be
 * reshuffled. If parameter is false, videos return to original order.
 * @param {boolean} shuffleVideos Mandatory Set to true to shuffle videos.
 */
function setShuffle(shuffleVideos) {
  if (shuffleVideos) {
    shuffleCount += 1;
    document.getElementById('player-shuffle-text').style.display = '';
    document.getElementById('player-unshuffle-link').style.display = '';
    document.getElementById('player-shuffle-link').innerHTML =
        'reshuffle';
  } else {
    shuffleCount = 0;
    document.getElementById('player-shuffle-text').style.display = 'none';
    document.getElementById('player-unshuffle-link').style.display =
        'none';
    document.getElementById('player-shuffle-link').innerHTML =
        'shuffle';
  }
  events.push('setShuffle(' + shuffleVideos + ');');
  player.setShuffle(shuffleVideos);
}

// Retrieving playlist information
/**
 * The 'getPlaylist' function returns a list of videos in a playlist.
 */
function getPlaylist() {
  var playlist = player.getPlaylist();
  if (playlist) {
    playlistVideosNode = document.getElementById('playlistvideos');
    if (playlistVideosNode) {
      while (playlistVideosNode.hasChildNodes()) {
        playlistVideosNode.removeChild(playlistVideosNode.firstChild);
      }
    }
    var listOfVideos = document.createElement('textarea');
    listOfVideos.id = 'playlist-videos';
    listOfVideos.cols = 52;
    listOfVideos.rows = Math.ceil(getPlaylistCount() / 4) + 1;
    listOfVideos.innerHTML = playlist.join(', ');
    playlistVideosNode.appendChild(listOfVideos);
  }
}

/**
 * The 'getPlaylistIndex' function returns the playlist index position
 * of the currently playing video based on the current playlist order.
 * It calls player.getPlaylistIndex().
 * @return {number} The playlist index of the currently playing video.
 */
function getPlaylistIndex() {
  var index = player.getPlaylistIndex();
  if (!index && index != 0) {
    return '';
  }
  return index;
}

/**
 * The 'getPlaylistCount' function returns the number of videos in a
 * playlist by calling player.getPlaylist() and returning the length
 * of the array returned by that function.
 * @return {number} The number of videos in the playlist.
 */
function getPlaylistCount() {
  var playlist = player.getPlaylist();
  if (playlist) {
    return playlist.length;
  }
}

// Changing the player volume

/**
 * The 'mute' function mutes the player. It calls player.mute().
 */
function mute() {
  events.push('mute();');
  player.mute();
}

/**
 * The 'unMute' function unmutes the player. It calls player.unMute().
 */
function unMute() {
  events.push('unMute();');
  player.unMute();
}

/**
 * The 'isMuted' function determines whether the player is muted.
 * @return {string} Returns 'on' if volume is on and 'off' if volume is muted.
 */
function isMuted() {
  if (!player.isMuted()) {
    return 'on';
  }
  return 'off';
}

/**
 * The 'getVolume' function returns the player volume. The volume is
 * returned as an integer on a scale of 0 to 100. This function will
 * not necessarily return 0 if the player is muted. Instead, it will
 * return the volume level that the player would be at if unmuted.
 * It calls player.getVolume().
 * @return {number} A number between 0 and 100 that specifies current volume.
 */
function getVolume() {
  return player.getVolume();
}

/**
 * The 'setVolume' function sets the player volume.
 * @param {number} newVolume Mandatory The new player volume. The value
 *     must be an integer between 0 and 100. It calls player.setVolume(volume).
 */
function setVolume(newVolume) {
  // XSS sanitizer -- make sure volume is just numbers.
  if (xssSanitizer('Volume', newVolume, 'digits')) {
    events.push('setVolume(' + newVolume + ');');
    player.setVolume(newVolume);
  }
}


// Playback status
/**
 * The 'getBytesLoaded' function returns the number of bytes loaded for
 * the current video. It calls player.getVideoBytesLoaded().
 * @return {number} The number of bytes loaded for the current video.
 */
function getBytesLoaded() {
  return player.getVideoBytesLoaded();
}

/**
 * The 'getBytesTotal' function returns the size in bytes of the currently
 * loaded/cued video. It calls player.getVideoBytesTotal().
 * @return {number} The total number of bytes in the video.
 */
function getBytesTotal() {
  return player.getVideoBytesTotal();
}

/**
 * The 'getVideoLoadedFraction' function returns the size in bytes of the currently
 * loaded/cued video. It calls player.getVideoLoadedFraction().
 * @return {number} The total number of bytes in the video.
 */
function getVideoLoadedFraction() {
  return player.getVideoLoadedFraction();
}

/**
 * The 'getStartBytes' function returns the number of bytes from which the
 * currently loaded video started loading. It calls player.getVideoStartBytes().
 * @return {number} The number of bytes into the video when the player
 *     began playing the video.
 */
function getStartBytes() {
  return player.getVideoStartBytes();
}

/**
 * The 'getPlayerState' function returns the status of the player.
 * @return {string} The current player's state -- e.g. 'playing', 'paused', etc.
 */
function getPlayerState() {
  if (player) {
    var playerState = player.getPlayerState();
    switch (playerState) {
      case 5:
        return 'video cued';
      case 3:
        return 'buffering';
      case 2:
        return 'paused';
      case 1:
        return 'playing';
      case 0:
        return 'ended';
      case -1:
        return 'unstarted';
      default:
        return 'Status uncertain';
    }
  }
}

/**
 * The 'getCurrentTime' function returns the elapsed time in seconds from
 * the beginning of the video. It calls player.getCurrentTime().
 * @return {number} The elapsed time, in seconds, of the playing video.
 */
function getCurrentTime() {
  var currentTime = player.getCurrentTime();
  return roundNumber(currentTime, 3);
}

// Playback quality
/**
 * The 'getQuality' function returns the actual playback quality of the
 * video shown in the player.
 * @return {string} The quality level of the currently playing video.
 */
function getQuality() {
  var quality = player.getPlaybackQuality();
  if (!quality) {
    return '';
  }
  return quality;
}

/**
 * The 'setQuality' function sets the suggested playback quality for the
 * video. It calls player.setPlaybackQuality(suggestedQuality:String).
 * @param {string} newQuality Mandatory The suggested playback quality.
 */
function setQuality(newQuality) {
  events.push('setPlaybackQuality(' + newQuality + ');');
  player.setPlaybackQuality(newQuality);
}

/**
 * The 'getQualityLevels' function retrieves the set of quality formats
 * in which the current video is available. It calls
 * player.getAvailableQualityLevels().
 * @return {string} A string (comma-separated values) of available quality
 *                  levels for the currently playing video.
 */
function getQualityLevels() {
  return player.getAvailableQualityLevels();
}

// Playback rate
/**
 * The 'getPlaybackRate' function returns the current playback rate of the
 * video shown in the player.
 * @return {string} The playback rate of the currently playing video.
 */
function getPlaybackRate() {
  return player.getPlaybackRate() || '';
}

/**
 * The 'setPlaybackRate' function sets the playback rate for the video.
 * It calls player.setPlaybackRate(playbackRate:String).
 * @param {string} playbackRate Mandatory The desired playback rate.
 */
function setPlaybackRate(playbackRate) {
  if (xssSanitizer('Playback rate', playbackRate, 'decimal')) {
    events.push('setPlaybackRate(' + playbackRate + ');');
    player.setPlaybackRate(playbackRate);
  }
}

/**
 * The 'getAvailablePlaybackRates' function retrieves the supported playback
 * rates for the currently playing video. It calls
 * player.getAvailablePlaybackRates().
 * @return {string} A string (comma-separated values) of available playback
 *                  rates for the currently playing video.
 */
function getAvailablePlaybackRates() {
  return player.getAvailablePlaybackRates();
}

// Retrieving video information

/**
 * The 'getDuration' function retrieves the length of the video. It calls
 * player.getDuration() function.
 * @return {number} The length of the video in seconds.
 */
function getDuration() {
  return player.getDuration();
}

/**
 * The 'getVideoUrl' function returns the YouTube.com URL for the
 * currently loaded/playing video. It calls player.getVideoUrl().
 */
function getVideoUrl() {
  var videoUrl = player.getVideoUrl();
  updateHTML('videoUrl', videoUrl);
}


// Player size ... setPlayerHeight and setPlayerSize

/**
 * The 'setPlayerHeight' function calculates the height of the player
 * for the given aspect ratio and width, which are specified in the demo.
 * This ensures that the player dimensions are a legitimate aspect ratio,
 * which should make videos look nicer.
 * @param {string} aspectRatio Mandatory The aspect ratio of the player.
 *     Valid values are 'standard' (4x3) and 'widescreen' (16x9).
 * @param {number} playerWidth Mandatory The pixel-width of the player.
 */
function setPlayerHeight(aspectRatio, playerWidth) {
  // XSS sanitizer -- make sure player width is just numbers.
  if (xssSanitizer('Width', playerWidth, 'digits')) {
    if (aspectRatio == 'widescreen') {
      updateHTML('playerHeight', ((playerWidth * 9) / 16));
    } else if (aspectRatio == 'standard') {
      updateHTML('playerHeight', ((playerWidth * 3) / 4));
    }
  }
}

/**
 * The 'setPlayerSize' function adjusts the size of the video and of the
 * DOM element to match the width and height set in the demo.
 * @param {number} playerWidth Mandatory The desired player width.
 * @param {number} playerHeight Mandatory The desired player width.
 */
function setPlayerSize(playerWidth, playerHeight) {
  if (xssSanitizer('Width', playerWidth, 'digits')) {
    events.push('setSize(' + playerWidth + ', ' + playerHeight + ');');
    player.setSize(playerWidth, playerHeight);
    document.getElementById(activePlayer).width = playerWidth;
    document.getElementById(activePlayer).height = playerHeight;
    document.getElementById('update-player-button').style.width =
        playerWidth + 'px';
  }
}

// Retrieving video information and playback status

/**
 * The 'updateytplayerInfo' function updates the volume and
 * "Playback statistics" displayed  on the page. (It doesn't actually
 * update the player itself.) The onYouTubePlayerReady uses the
 * setInterval() function to indicate that this function should run
 * every 600 milliseconds.
 */
function updateytplayerInfo() {
  if (player) {
    updateHTML('volume', getVolume());

    updateHTML('videoduration', getDuration());
    updateHTML('videotime', getCurrentTime());
    updateHTML('playerstate', getPlayerState());

    updateHTML('bytestotal', getBytesTotal());
    updateHTML('startbytes', getStartBytes());
    if (playerVersion != 'as2') {
      updateHTML('percentloaded', getVideoLoadedFraction());
      updateHTML('playbackrate', getPlaybackRate());
      updateHTML('availableplaybackrates', getAvailablePlaybackRates());
    }
    updateHTML('bytesloaded', getBytesLoaded());

    updateHTML('playbackquality', getQuality());
    updateHTML('availablelevels', getQualityLevels());
    updateHTML('ismuted', isMuted());

    // TODO: Move calls to getPlaylistCount() and getPlaylist()
    // elsewhere since these only change when player content changes.
    if (contentType != 'video' && contentType != 'videolist') {
      updateHTML('playlistcount', getPlaylistCount());
      updateHTML('currentplaylistvideo', getPlaylistIndex());
      getPlaylist();
    }
  }
  if (events.length > 0) {
    updateHTML('eventhistory', '<ol><li>' + events.join('<li>') + '</ol>');
  }
  if (errors.length > 0) {
    updateHTML('errorCode', '<ol><li>' + errors.join('<li>') + '</ol>');
  }
}

function roundNumber(number, decimalPlaces) {
  decimalPlaces = (!decimalPlaces ? 2 : decimalPlaces);
  return Math.round(number * Math.pow(10, decimalPlaces)) /
      Math.pow(10, decimalPlaces);
}

/**
 * The 'getEmbedCode' function returns the embed code for the currently
 * loaded/playing video. It then creates a node to add the embed code
 * to the page. It calls player.getVideoEmbedCode().
 *
 * This function also runs if the user updates the embedded player parameters.
 * In that case, the function modifies the sample embed code and
 * calls the redrawPlayer() function to update the sample player, too.
 */
function getEmbedCode() {
  var result = player.getVideoEmbedCode();
  var iframeEmbedNode = document.getElementById('iframe-embed-code');
  if (iframeEmbedNode) {
    while (iframeEmbedNode.hasChildNodes()) {
      iframeEmbedNode.removeChild(iframeEmbedNode.firstChild);
    }
  }

  var objectEmbedNode = document.getElementById('object-embed-code');
  if (objectEmbedNode) {
    while (objectEmbedNode.hasChildNodes()) {
      objectEmbedNode.removeChild(objectEmbedNode.firstChild);
    }
  }

  if (playerType == 'chromeless') {
    document.getElementById('embedDisclaimer').style.display = '';
    document.getElementById('horzTab2').style.display = 'none';
  } else {
    document.getElementById('embedDisclaimer').style.display = 'none';
    document.getElementById('horzTab2').style.display = '';
    if (result) {
      // Default embed code being returned contains 'version=3'.
      // Replace 'version=3' with 'version=2' if user is testing AS2 API
      if (playerVersion == 'as2') {
        result = result.replace(/version=3/g, 'version=2');
      }

      // Define new element for IFrame embed content
      var newIframeEmbedNode;
      if (playerVersion == 'as2') {
        newIFrameEmbedNode = document.createElement('span');
        newIFrameEmbedNode.innerHTML = 'You cannot embed an AS2 ' +
            'player using IFrame embeds.';
      } else {
        newIFrameEmbedNode = document.createElement('textarea');
        newIFrameEmbedNode.id = 'iframe-embed-string';
        newIFrameEmbedNode.cols = 62;
        newIFrameEmbedNode.rows = 12;
      }

      var playerWidth = document.getElementById('playerWidth').value;
      var playerHeight = document.getElementById('playerHeight').innerHTML;

      var newObjectEmbedNode = document.createElement('textarea');
      newObjectEmbedNode.id = 'object-embed-string';
      newObjectEmbedNode.cols = 62;
      newObjectEmbedNode.rows = 12;

      var argString = getEmbeddedPlayerOptions('');
      var iframeArgString = (argString) ?
          '?' + argString.substring(1, argString.length) :
          iframeArgString = '';
      var playerEmbeddedRegex = /feature=player_embedded/;
      if (!result.match(playerEmbeddedRegex)) {
        argString += '&feature=player_embedded';
      }

      // Set height and width to match provided values.
      result = result.replace(/width=\"([^\"]+)/, 'width="' + playerWidth);
      result = result.replace(/width\: ([0-9]+)/, 'width="' + playerWidth);
      result = result.replace(/height=\"([^\"]+)/, 'height="' + playerHeight);
      result = result.replace(/height\: ([0-9]+)/, 'height="' + playerHeight);

      // Replace whatever parameters are in the standard embed code
      // with the customized parameters set by the user.
      result = result.replace(/www.youtube.com([^\"]+)/g,
          'www.youtube.com$1' + argString);

      if (contentType == 'videolist') {
        var videoListArray = playerContent.split(',');
        var videoList = '';
        for (var item = 1; item < videoListArray.length; item++) {
          videoList += videoListArray[item] + ',';
        }
        result = result.replace(/version=/g, 'playlist=' +
            videoList.substring(0, videoList.length - 1) + '&version=');
      } else if (contentType != 'video' && contentType != 'videolist') {
        if (contentType == 'search') {
          playerContent = escape(playerContent);
        }
        result = result.replace(/\/v\/([^\?]+)\?/g, '/v/videoseries?' +
            'listType=' + contentType + '&list=' + playerContent + '&');
      }

      iframeArgString = getIFrameEmbedContent(iframeArgString);
      var embedUrlArray = result.match(/https?:\/\/www.youtube.com([^\"]+)/g);
      var embedUrl = 'https://www.youtube.com/v/';
      if (iframeArgString.indexOf('?') == 0) {
        embedUrl += 'videoseries';
      }
      embedUrl += iframeArgString;
      if (embedUrl.indexOf('?') == -1) {
        embedUrl += '?version=3';
      } else if (embedUrl.indexOf('version=') == -1) {
        embedUrl += '&version=3';
      }

      // Make the embed code easier to read and append to output node
      result = result.replace(/><([^\/])/g, '>\n<$1');
      var objectEmbedCode =
          '<object width="' + playerWidth + '" height="' +
          playerHeight + '">\n' +
          '  <param name="movie" value="' + embedUrl + '"></param>\n' +
          '  <param name="allowFullScreen" value="true"></param>\n' +
          '  <param name="allowScriptAccess" value="always"></param>\n' +
          '  <embed src="' + embedUrl + '" ' +
          'type="application/x-shockwave-flash" ' +
          'allowfullscreen="true" allowScriptAccess="always" ' +
          'width="' + playerWidth + '" height="' + playerHeight + '">' +
          '</embed>\n' +
          '</object>';

      if (playerVersion == 'html5') {
        newObjectEmbedNode.value = objectEmbedCode;
      } else {
        newObjectEmbedNode.value = result;
      }
      objectEmbedNode.appendChild(newObjectEmbedNode);

      if (playerType == 'embedded') {
        newIFrameEmbedNode.value = '<iframe id="ytplayer" type="text/html" ' +
            'width="' + playerWidth + '" height="' + playerHeight + '"\n' +
            'src="https://www.youtube.com/embed/' + iframeArgString +
            '"\n' + 'frameborder="0" allowfullscreen>';
      }
      iframeEmbedNode.appendChild(newIFrameEmbedNode);
    }
  }
}

function getIFrameEmbedContent(iframeArgString) {
  var startTime = document.getElementById('startseconds').value;
  if (contentType == 'video') {
    return playerContent + iframeArgString;
  } else if (contentType == 'videolist') {
    var videoListArray = playerContent.split(',');
    var videoList = '';
    for (listItem = 1; listItem < videoListArray.length; listItem++) {
      videoList += videoListArray[listItem] + ',';
    }
    if (iframeArgString) {
      return iframeArgString.replace(/\?/, videoListArray[0] + '?playlist=' +
          videoList.substring(0, (videoList.length - 1)) + '&version=3&');
    } else {
      return videoListArray[0] + '?playlist=' +
          videoList.substring(0, (videoList.length - 1)) + '&version=3';
    }
  } else {
    if (contentType == 'search') {
      playerContent = escape(playerContent);
    }
    if (iframeArgString) {
      return iframeArgString.replace(/\?/, '?listType=' + contentType +
          '&list=' + playerContent + '&');
    } else {
      return '?listType=' + contentType + '&list=' + playerContent;
    }
  }
}


/**
 * This function writes the parameter name and tooltip for player parameters.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 */
function writePlayerParameter(parameterName, tooltipText, supportedPlayers) {
  document.write('<tr id="' + parameterName + '-param">' +
      '<td class="noborder">' + parameterName + '&nbsp;' +
      '<a class="tooltip" href="#" onclick="return false;">' +
      '<img src="/youtube/images/icon-help.gif" alt="" />' +
      '<span class="tooltip-content tooltip-right-align">' + tooltipText +
      '</span></a><br/><div class="supported-players">(' +
      supportedPlayers + ')</div></td>');
}

/**
 * This function lists the supported players for a player parameter.
 * @param {string} supportedPlayers Mandatory List of supported players.
 */
function writePlayerParameterSupport(supportedPlayers) {
  document.write('<td class="supported-players">' + supportedPlayers + '</td>');
}

/**
 * This function writes a checkbox for a player parameter.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 * @param {string} checked Mandatory 'checked' or ''.
 */
function writePlayerParameterCheckbox(parameterName, tooltipText,
    supportedPlayers, checked) {
  writePlayerParameter(parameterName, tooltipText, supportedPlayers);
  document.write('<td class="noborder valignMiddle">' +
      '<input id="embedded-player-' + parameterName + '" type="checkbox" ' +
      checked + '/></td>');
  //writePlayerParameterSupport(supportedPlayers);
  document.write('</tr>');
}

/**
 * This function writes a checkbox for a player parameter.
 * @param {string} parameterName Mandatory The name of the parameter.
 * @param {string} tooltipText Mandatory Text for the parameter's tooltip.
 * @param {string} supportedPlayers Mandatory List of supported players.
 * @param {string} parameterValue Mandatory Default value for the parameter.
 * @param {string} inputSize Mandatory Size of the input field.
 * @param {string} additionalParams Mandatory Additional stuff to stick in
 *     the input field. '' if there's nothing additional.
 */
function writePlayerParameterTextInput(parameterName, tooltipText,
    supportedPlayers, parameterValue, inputSize, additionalParams) {
  writePlayerParameter(parameterName, tooltipText, supportedPlayers);
  document.write('<td class="noborder valignMiddle">' +
    '<input id="embedded-player-' + parameterName + '" type="text" ' +
    'value="' + parameterValue + '" size="' + inputSize + '" ' +
    additionalParams + '/>');
  if (parameterName == 'color1' || parameterName == 'color2') {
    document.write('&nbsp;<span id="embedded-player-' + parameterName +
        '-preview" style="border:solid 1px;width:12px;background:#b1b1b1">' +
        '&nbsp;&nbsp;&nbsp;</span>');
  }
  document.write('</td>');
  //writePlayerParameterSupport(supportedPlayers);
  document.write('</tr>');
}

/** VALIDATION **/
/**
 * The 'sanitizePlayerContentInput' function ensures that the user
 * has entered a valid value for the requested content type.
 * @param {string} contentType Mandatory Value could be video, videolist,
 *     playlist, user_uploads, user_favorites, search.
 * @param {string} playerContent Mandatory In conjunction with the
 *     contentType value, this identifies the content the player will
 *     load. Value could be a video ID, playlist ID, username, etc.
 * @return {boolean} Indication of whether player content value is okay
 *     from XSS perspective.
 */
function sanitizePlayerContentInput() {
  if ((contentType == 'video' && xssSanitizer('Video ID', playerContent,
      'videoId')) ||
      (contentType == 'videolist' &&
      xssSanitizer('Video IDs', playerContent, 'playlist')) ||
      (contentType == 'playlist' &&
      xssSanitizer('Playlist ID', playerContent, 'playlistId')) ||
      (contentType == 'search' &&
      xssSanitizer('Search query', playerContent, 'search')) ||
      (xssSanitizer('Username', playerContent, 'username'))) {
    return true;
  } else {
    return false;
  }
}

/**
 * The 'xssSanitizer' function tries to make sure that the user isn't being
 * directed to something that would exploit an XSS vulnerability by verifying
 * that the input value matches a particular rule. If the provided value is
 * invalid, the page will display an error indicating that either the value
 * is invalid or that it doesn't have XSS vulnerabilities to exploit.
 * @param {string} field Mandatory A name that identifies the field being
 *     validated. This will appear in the error list if the value is bad.
 * @param {string} value Mandatory The value to be validated.
 * @param {string} rulesOfSanitation Mandatory A string that identifies
 *     the accepted format of the value -- e.g. alphanumeric, digits,
 *     videoId, etc.
 * @param {boolean} skipEvent Optional A flag that indicates that the
 *     error should not be printed. This is used to avoid inadvertently
 *     displaying an error when a field could include, say, a videoId or
 *     a videoUrl.
 * @return {boolean} Returns true if the value is valid and false if not.
 */
function xssSanitizer(field, value, rulesOfSanitation, skipEvent) {
  var regex = /[\"\<\>]/;
  if (value.match(regex)) {
    errors.push('These aren\'t the XSS vulnerabilities you\'re ' +
        'looking for.');
    return false;
  } else if (rulesOfSanitation) {
    if (rulesOfSanitation == 'alphanumeric') {
      var regex = /[\W]/;
      if (value.match(regex)) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be an alphanumeric string.');
        return false;
      }
    } else if (rulesOfSanitation == 'digits') {
      var regex = /[\D]/;
      if (value.match(regex)) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be an integer.');
        return false;
      }
    } else if (rulesOfSanitation == 'decimal') {
      var regex = /[0-9\.]+/;
      if (!value.match(regex)) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be an integer or decimal value.');
        return false;
      }
    } else if (rulesOfSanitation == 'playlist') {
      var regex = /^[\w\-]{11}(,[\w\-]{11})*$/;
      if (!value.match(regex)) {
        errors.push('This \'' + field + '\' value (' + value +
            ')is not supported. The value must be a comma-delimited ' +
            'list of 11-character YouTube video IDs.');
        return false;
      }
    } else if (rulesOfSanitation == 'playlistId') {
      var regex = /^PL([\w]+)$/;
      if (!value.match(regex)) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be a valid YouTube playlist ID, ' +
            'prepended with the string \'PL\'.');
        return false;
      }
    } else if (rulesOfSanitation == 'username') {
      var regex = /[\W]/;
      if (value.match(regex)) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be an alphanumeric string.');
        return false;
      }
    } else if (rulesOfSanitation == 'qualitylevels') {
      if (qualityLevels[value]) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be a supported quality level.');
      }
    } else if (rulesOfSanitation == 'videoIdOrUrl') {
      if (!xssSanitizer(field, value, 'videoId', true)) {
        if (!xssSanitizer(field, value, 'videoUrl', true)) {
          errors.push('This \'' + field + '\' value is not supported. ' +
              'The value must be an 11-character YouTube video ID or ' +
              'a YouTube watch page URL in the format ' +
              '\'http://www.youtube.com/v/VIDEO_ID\'.');
          return false;
        }
      }
    } else if (rulesOfSanitation == 'videoId') {
      var regex = /^[\w\-]{11}$/;
      if (value.match(regex)) {
        return true;
      }
      if (!skipEvent) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be an 11-character YouTube video ID.');
      }
      return false;
    } else if (rulesOfSanitation == 'videoUrl') {
      var regex = /^http\:\/\/www.youtube.com\/v\/([\w\-]){11}$/;
      if (value.match(regex)) {
        return true;
      }
      if (!skipEvent) {
        errors.push('This \'' + field + '\' value is not supported. ' +
            'The value must be a YouTube watch page URL in the ' +
            'format \'http://www.youtube.com/v/VIDEO_ID\'.');
      }
      return false;
    } else if (rulesOfSanitation == 'search') {
      return true;
    }
  }
  return true;
}

