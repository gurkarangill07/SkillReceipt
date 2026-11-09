# Camera test fixture

`astronaut.png` is NASA's public-domain photograph of astronaut Eileen Collins, distributed in [scikit-image v0.19.3](https://github.com/scikit-image/scikit-image/blob/v0.19.3/skimage/data/astronaut.png). It is used only by the local browser tests. It is never a candidate identity reference or part of the production app.

The test draws this image onto a canvas stream to exercise the real MediaPipe detector. It can render zero, one or two faces and a covered camera. This verifies software behavior with controlled media, not physical webcam hardware or liveness.
