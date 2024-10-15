document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.getElementsByClassName('close')[0];
    const images = document.querySelectorAll('.coral-image');
    const prevBtn = document.createElement('button');
    const nextBtn = document.createElement('button');

    let currentImageIndex = 0;

    // Add navigation buttons to the modal
    prevBtn.innerText = '< Prev';
    nextBtn.innerText = 'Next >';
    prevBtn.classList.add('nav-btn', 'prev-btn');
    nextBtn.classList.add('nav-btn', 'next-btn');
    modal.appendChild(prevBtn);
    modal.appendChild(nextBtn);

    function showImage(index) {
        modalImg.src = images[index].src;
        currentImageIndex = index;
        updateNavButtons();
    }

    function updateNavButtons() {
        prevBtn.style.display = currentImageIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = currentImageIndex < images.length - 1 ? 'block' : 'none';
    }

    images.forEach((img, index) => {
        img.onclick = function() {
            modal.style.display = "block";
            showImage(index);
        }
    });

    prevBtn.onclick = function() {
        if (currentImageIndex > 0) {
            showImage(currentImageIndex - 1);
        }
    }

    nextBtn.onclick = function() {
        if (currentImageIndex < images.length - 1) {
            showImage(currentImageIndex + 1);
        }
    }

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});