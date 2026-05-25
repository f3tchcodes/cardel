const userSettingsBtn =
    document.querySelector(".userSettings");

const overlay =
    document.getElementById(
        "cdl-userSettingsOverlay"
    );

const closeBtn =
    document.getElementById(
        "cdl-closeUserSettings"
    );


// OPEN
userSettingsBtn.addEventListener(
    "click",
    () => {

        overlay.classList.add(
            "cdl-open"
        );

        document.body.style.overflow =
            "hidden";

    }
);


// CLOSE
function closeModal(){

    overlay.classList.remove(
        "cdl-open"
    );

    document.body.style.overflow =
        "";

}

closeBtn.addEventListener(
    "click",
    closeModal
);


overlay.addEventListener(
    "click",
    e => {

        if(
            e.target === overlay
        ){
            closeModal();
        }

    }
);


// TAB SWITCHING
document
.querySelectorAll(
    ".settings-tab"
)
.forEach(tab => {

    tab.addEventListener(
        "click",
        () => {

            document
            .querySelectorAll(
                ".settings-tab"
            )
            .forEach(
                t => t.classList.remove(
                    "settings-tab-active"
                )
            );

            document
            .querySelectorAll(
                ".settings-panel"
            )
            .forEach(
                p => p.classList.remove(
                    "settings-panel-active"
                )
            );

            tab.classList.add(
                "settings-tab-active"
            );

            document
            .getElementById(
                `${tab.dataset.tab}-panel`
            )
            .classList.add(
                "settings-panel-active"
            );

        }
    );

});


// PROFILE IMAGE PREVIEW
document
.getElementById(
    "profilePictureInput"
)
.addEventListener(
    "change",
    function(){

        if(
            this.files &&
            this.files[0]
        ){

            const reader =
                new FileReader();

            reader.onload =
                e => {

                document
                .getElementById(
                    "profilePreview"
                )
                .src =
                e.target.result;

            };

            reader.readAsDataURL(
                this.files[0]
            );

        }

    }
);
