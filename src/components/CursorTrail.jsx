import { useEffect } from "react";

function CursorTrail() {
  useEffect(() => {
    const dots = [];
    const DOT_COUNT = 30;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    for (let i = 0; i < DOT_COUNT; i++) {
      const element = document.createElement("div");

      element.className = "cursor-dot";

      document.body.appendChild(element);

      const angle = Math.random() * Math.PI * 2;
      const distance = 18 + Math.random() * 65;

      dots.push({
        element,

        angle,
        distance,

        x: mouseX,
        y: mouseY,

        offsetX: 0,
        offsetY: 0,

        speed: 0.04 + Math.random() * 0.08,

        driftX: (Math.random() - 0.5) * 0.4,
        driftY: (Math.random() - 0.5) * 0.4,

        size: 1 + Math.random() * 2,

        opacity: 0.25 + Math.random() * 0.7
      });

      element.style.width = `${dots[i].size}px`;
      element.style.height = `${dots[i].size}px`;
      element.style.opacity = dots[i].opacity;
    }

    function handleMouseMove(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrame;

    function animate() {
      dots.forEach((dot) => {
        dot.angle += 0.0015;

        const targetX =
          mouseX +
          Math.cos(dot.angle) * dot.distance;

        const targetY =
          mouseY +
          Math.sin(dot.angle) * dot.distance;

        dot.x +=
          (targetX - dot.x) * dot.speed;

        dot.y +=
          (targetY - dot.y) * dot.speed;

        dot.offsetX += dot.driftX;
        dot.offsetY += dot.driftY;

        dot.element.style.transform =
          `translate3d(
            ${dot.x + dot.offsetX}px,
            ${dot.y + dot.offsetY}px,
            0
          )`;
      });

      animationFrame = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      cancelAnimationFrame(animationFrame);

      dots.forEach((dot) => {
        dot.element.remove();
      });
    };
  }, []);

  return null;
}

export default CursorTrail;