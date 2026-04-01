(function () {
  "use strict";

  var EVENTS = {
    wedding: {
      title: "Wedding Ceremony",
      calendarTitle: "Keerthana and Shravan Wedding",
      date: "2026-04-10T11:41:00+05:30",
      duration: 4,
      venue: "Shubhalaxmi Auditorium",
      address: "Benjanpadav, Bantwal, Karnataka 574219",
      lat: 12.904474613001197,
      lng: 74.97528888025847
    },
    mehendi: {
      title: "Mehendi Ceremony",
      calendarTitle: "Keerthana and Shravan Mehendi",
      date: "2026-04-08T19:30:00+05:30",
      duration: 5,
      venue: "Kalpavraksha House",
      address: "Pallamajal Kallagudde, Bantwal",
      lat: 12.89118259617451,
      lng: 75.00963868137455
    },
    reception: {
      title: "Reception",
      calendarTitle: "Keerthana and Shravan Reception",
      date: "2026-04-11T11:00:00+05:30",
      duration: 5,
      venue: "Kalpavraksha House",
      address: "Pallamajal Kallagudde, Bantwal",
      lat: 12.89118259617451,
      lng: 75.00963868137455
    }
  };

  var IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var envelopeScreen = document.getElementById("envelopeScreen");
  var envelope = document.getElementById("envelope");
  var goldenBurst = document.getElementById("goldenBurst");
  var navDim = document.getElementById("navDim");
  var mainContent = document.getElementById("mainContent");
  var weddingSection = document.getElementById("weddingSection");
  var weddingVideo = document.getElementById("weddingVideo");
  var backgroundMusic = document.getElementById("bgMusic");
  var soundToggle = document.getElementById("soundToggle");
  var soundToggleLabel = soundToggle.querySelector(".sound-btn__label");
  var scrollHint = document.getElementById("scrollHint");

  var state = {
    envelopeOpened: false,
    soundOn: true,
    heroInView: true,
    navigatingAway: false
  };

  var volumeTweens = new WeakMap();

  function formatUtcDate(date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  function playMedia(media) {
    try {
      var result = media.play();
      if (result && typeof result.then === "function") {
        return result;
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function pauseMedia(media) {
    if (media) {
      media.pause();
    }
  }

  function stopTween(media) {
    var activeTween = volumeTweens.get(media);
    if (activeTween) {
      cancelAnimationFrame(activeTween);
      volumeTweens.delete(media);
    }
  }

  function animateVolume(media, target, duration, onComplete) {
    if (!media) {
      if (typeof onComplete === "function") {
        onComplete();
      }
      return;
    }

    stopTween(media);

    var startVolume = Number.isFinite(media.volume) ? media.volume : 1;
    var startTime = performance.now();
    var total = Math.max(duration || 0, 1);

    function tick(now) {
      var progress = Math.min((now - startTime) / total, 1);
      media.volume = startVolume + (target - startVolume) * progress;

      if (progress < 1) {
        volumeTweens.set(media, requestAnimationFrame(tick));
      } else {
        volumeTweens.delete(media);
        if (typeof onComplete === "function") {
          onComplete();
        }
      }
    }

    volumeTweens.set(media, requestAnimationFrame(tick));
  }

  function setSoundButton() {
    soundToggle.classList.toggle("is-muted", !state.soundOn);
    soundToggleLabel.textContent = state.soundOn ? "Sound on" : "Sound off";
    soundToggle.setAttribute("aria-label", state.soundOn ? "Turn sound off" : "Turn sound on");
  }

  function pauseAllMedia() {
    stopTween(weddingVideo);
    stopTween(backgroundMusic);
    pauseMedia(weddingVideo);
    pauseMedia(backgroundMusic);
  }

  function syncMediaToState() {
    if (!state.envelopeOpened || state.navigatingAway || document.hidden) {
      return;
    }

    if (state.heroInView) {
      if (state.soundOn) {
        animateVolume(backgroundMusic, 0, 220, function () {
          pauseMedia(backgroundMusic);
        });

        weddingVideo.volume = 0;
        weddingVideo.muted = false;
        playMedia(weddingVideo).catch(function () {
          state.soundOn = false;
          setSoundButton();
          weddingVideo.muted = true;
          weddingVideo.volume = 0;
          playMedia(weddingVideo).catch(function () {});
        });
        animateVolume(weddingVideo, 1, 340);
      } else {
        pauseMedia(backgroundMusic);
        weddingVideo.volume = 0;
        weddingVideo.muted = true;
        playMedia(weddingVideo).catch(function () {});
      }
      return;
    }

    if (state.soundOn) {
      weddingVideo.muted = true;
      animateVolume(weddingVideo, 0, 220, function () {
        pauseMedia(weddingVideo);
      });

      backgroundMusic.volume = 0;
      playMedia(backgroundMusic).catch(function () {});
      animateVolume(backgroundMusic, 1, 360);
    } else {
      pauseMedia(weddingVideo);
      pauseMedia(backgroundMusic);
    }
  }

  function openInvitation() {
    var burstDelay = PREFERS_REDUCED_MOTION ? 140 : 620;
    var revealDelay = PREFERS_REDUCED_MOTION ? 260 : 1450;

    if (state.envelopeOpened) {
      return;
    }

    state.envelopeOpened = true;
    envelope.classList.add("opening");

    setTimeout(function () {
      goldenBurst.classList.add("active");
    }, burstDelay);

    setTimeout(function () {
      goldenBurst.classList.remove("active");
      envelopeScreen.classList.add("hidden");
      mainContent.classList.add("visible");
      soundToggle.classList.add("visible");
      setSoundButton();

      weddingVideo.volume = 0;
      weddingVideo.muted = false;

      playMedia(weddingVideo).then(function () {
        animateVolume(weddingVideo, state.soundOn ? 1 : 0, 420);
        if (!state.soundOn) {
          weddingVideo.muted = true;
        }
      }).catch(function () {
        state.soundOn = false;
        setSoundButton();
        weddingVideo.muted = true;
        weddingVideo.volume = 0;
        playMedia(weddingVideo).catch(function () {});
      });

      if (PREFERS_REDUCED_MOTION) {
        document.querySelectorAll(".reveal").forEach(function (element) {
          element.classList.add("visible");
        });
      } else {
        syncMediaToState();
      }
    }, revealDelay);
  }

  function handleEnvelopeKey(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openInvitation();
  }

  function hideScrollHint() {
    scrollHint.classList.toggle("is-hidden", window.scrollY > 48);
  }

  function updateHeroViewFromScroll() {
    var rect = weddingSection.getBoundingClientRect();
    var inView = rect.top < window.innerHeight * 0.66 && rect.bottom > window.innerHeight * 0.34;

    if (inView !== state.heroInView) {
      state.heroInView = inView;
      syncMediaToState();
    }
  }

  function navigateWithFade(url) {
    if (state.navigatingAway) {
      return;
    }

    state.navigatingAway = true;
    navDim.classList.add("active");

    animateVolume(backgroundMusic, 0, 160, function () {
      pauseMedia(backgroundMusic);
    });
    animateVolume(weddingVideo, 0, 160, function () {
      weddingVideo.muted = true;
      pauseMedia(weddingVideo);
    });

    setTimeout(function () {
      window.location.href = url;
    }, 260);
  }

  function buildDirectionsUrl(eventData) {
    var destination = eventData.lat + "," + eventData.lng;

    if (IS_IOS) {
      return "maps://maps.apple.com/?daddr=" + destination;
    }

    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
  }

  function buildCalendarUrl(eventData) {
    var start = new Date(eventData.date);
    var end = new Date(start.getTime() + eventData.duration * 3600000);
    var location = eventData.venue + ", " + eventData.address;

    if (IS_IOS) {
      var ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wedding Invite//EN",
        "BEGIN:VEVENT",
        "DTSTART:" + formatUtcDate(start),
        "DTEND:" + formatUtcDate(end),
        "SUMMARY:" + eventData.calendarTitle,
        "LOCATION:" + location,
        "DESCRIPTION:" + eventData.title + " - " + eventData.venue,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      var blob = new Blob([ics], { type: "text/calendar" });
      var blobUrl = URL.createObjectURL(blob);

      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 60000);

      return blobUrl;
    }

    return "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(eventData.calendarTitle)
      + "&dates=" + formatUtcDate(start) + "/" + formatUtcDate(end)
      + "&details=" + encodeURIComponent(eventData.title + " at " + eventData.venue)
      + "&location=" + encodeURIComponent(location);
  }

  function bindActionButtons() {
    document.querySelectorAll(".map-btn").forEach(function (button) {
      var eventData = EVENTS[button.dataset.event];

      if (!eventData) {
        return;
      }

      var url = buildDirectionsUrl(eventData);
      button.href = url;

      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateWithFade(url);
      });
    });

    document.querySelectorAll(".cal-btn").forEach(function (button) {
      var eventData = EVENTS[button.dataset.event];

      if (!eventData) {
        return;
      }

      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateWithFade(buildCalendarUrl(eventData));
      });
    });
  }

  function bindRevealObserver() {
    if (PREFERS_REDUCED_MOTION || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (element) {
        element.classList.add("visible");
      });
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    document.querySelectorAll(".reveal").forEach(function (element) {
      revealObserver.observe(element);
    });
  }

  function bindHeroObserver() {
    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", updateHeroViewFromScroll, { passive: true });
      return;
    }

    var heroObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        state.heroInView = entry.intersectionRatio >= 0.35;
        syncMediaToState();
      });
    }, { threshold: 0.35 });

    heroObserver.observe(weddingSection);
  }

  envelope.addEventListener("click", openInvitation);
  envelope.addEventListener("keydown", handleEnvelopeKey);

  soundToggle.addEventListener("click", function () {
    state.soundOn = !state.soundOn;
    setSoundButton();
    syncMediaToState();
  });

  document.addEventListener("visibilitychange", function () {
    if (!state.envelopeOpened) {
      return;
    }

    if (document.hidden) {
      pauseAllMedia();
      return;
    }

    syncMediaToState();
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted || !state.envelopeOpened) {
      return;
    }

    state.navigatingAway = false;
    navDim.classList.remove("active");
    syncMediaToState();
  });

  window.addEventListener("focus", function () {
    if (!state.envelopeOpened || state.navigatingAway || document.hidden) {
      return;
    }

    syncMediaToState();
  });

  window.addEventListener("scroll", hideScrollHint, { passive: true });

  bindActionButtons();
  bindRevealObserver();
  bindHeroObserver();
  hideScrollHint();
  setSoundButton();
})();
