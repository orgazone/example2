var appCache = window.applicationCache;

// Check if a new cache is available on page load.
window.addEventListener('load', function(e) {
    window.applicationCache.addEventListener('updateready', function(e) {
        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            // Browser downloaded a new app cache.
            //if (confirm('A new version of this site is available. Load it?')) {window.location.reload();}

            appCache.swapCache(); // The fetch was successful, swap in the new cache.
            window.location.reload();
        } else {
            // Manifest didn't changed. Nothing new to server.
        }
    }, false);

}, false);


if (!window.app) {
    window.app = {
        date: null,

        //Everything kicks off here
        init: function() {
            app.changePage("homePage");
            this.addEventlistener();

            orga.database.init();
            orga.logger.init();
            orga.dateTimePicker.init();
            //Not required right now
            //orga.registerApp();
        },

        /**
         * Add event listeners
         * */
        addEventlistener: function() {

            $("#shortcut").click(function() {
                if (!app.isMobile()) {
                    app.bookmarkApp();
                }
            });

            //Save button click handler
            $('#saveNewPage').on('click', "#saveNewData", function() {
                var timestamp = orga.selectedDate;
                var title = $("#titleNote").val();
                var message = $("#detailNote").val();

                if (orga.validateForm(timestamp, title, message)) {
                    orga.database.saveNewNote(timestamp, title, message);
                    app.changePage("homePage");
                }
            });

            //Show list item click handler
            $('#homePage').on('click', "#showListItem", function() {
                app.changePage("listPage");
            });

            //Add item click handler
            $('#homePage').on('click', '#addNewItems', function() {
                app.changePage("saveNewPage");
            });

            //Show logs click handler
            $('#homePage').on('click', '#showLogsBtn', function() {
                app.changePage("loglistPage");
            });

            //Clear all btn click handler
            $('#listPage').on('click', '#clearAllData', function() {
                var r = confirm("Do you really want to delete all the entries!");
                if (r == true) {
                    //OK
                    orga.database.clearSavedNotes();
                    app.listPageInit();
                } else {
                    //Cancel
                }
            });

            $('#saveNewPage').on('click', '#deleteEntry', function() {
                //Delete entry
                orga.deleteItem($(this).parent().attr("updateid"));
            });

            $('#saveNewPage').on('click', '#updateEntry', function() {
                //Update entry
                var timestamp = orga.selectedDate;
                var title = $("#titleNote").val();
                var message = $("#detailNote").val();

                if (orga.validateForm(timestamp, title, message)) {
                    orga.database.saveNewNote(timestamp, title, message, $(this).parent().attr("updateid"));
                    app.changePage("homePage");
                }
            });

            //Back navigation
            $("#navIcon").click(function() {
                if ($(this).hasClass("ui-icon-back")) {
                    app.changePage("homePage");
                }
            });
        },

        /**
         * Method to handle page changes
         */
        changePage: function(newPage, additionalData) {
            // Hide all pages
            $("#homePage").hide();
            $("#listPage").hide();
            $("#saveNewPage").hide();
            $("#loglistPage").hide();

            var view;
            switch (newPage) {
                case "homePage":
                    view = "views/home.tmpl.html";
                    app.renderPage(view, newPage);
                    $('#homePage').show();
                    break;
                case "saveNewPage":
                    view = "views/edit.tmpl.html";
                    app.renderPage(view, newPage);
                    app.saveNewPageInit();
                    $('#saveNewPage').show();
                    break;
                case "listPage":
                    view = "views/list.tmpl.html";
                    app.renderPage(view, newPage);
                    app.listPageInit();
                    $('#listPage').show();
                    break;
                case "editPage":
                    view = "views/edit.tmpl.html";
                    app.renderPage(view, "saveNewPage"); //Save page is used for edit page
                    app.editPageInit(additionalData);
                    $('#saveNewPage').show();
                    break;
                case "loglistPage":
                    view = "views/loglist.tmpl.html";
                    app.renderPage(view, newPage);
                    app.loglistPageInit();
                    $('#loglistPage').show();
                    break;
                default:
                    break;
            }

            if (newPage === "homePage") {
                app.changeNavIcon(true);
            } else {
                app.changeNavIcon(false);
            }
        },

        renderPage: function(view, page) {
            //Bind to template
            var id = "#" + page;
            $.ajax({
                url: view,
                success: function(source) {
                    template = Handlebars.compile(source);
                    $(id).html(template());
                    $(id).trigger("create");
                },
                async: false
            });
        },

        changeNavIcon: function(isHome) {
            if (isHome) {
                $("#navIcon").addClass("ui-icon-home");
                $("#navIcon").removeClass("ui-icon-back");
            } else {
                $("#navIcon").addClass("ui-icon-back");
                $("#navIcon").removeClass("ui-icon-home");
            }
        },

        listPageInit: function() {
            orga.renderList();
        },

        saveNewPageInit: function() {
            orga.selectedDate = new Date();
            orga.dateTimePicker.init();

            //Hide show update and delete button & show save button 
            $("#updateEntryContainer").hide();
            $("#saveEntryContainer").show();
        },

        editPageInit: function(id) {

            var index = orga.database.getItemIndex(id);
            var data = orga.database.notesDataArray.data[index];
            orga.selectedDate = new Date(data.timeStamp);

            orga.dateTimePicker.init(data.timeStamp);

            $("#titleNote").val(data.title);
            $("#detailNote").val(data.notes);

            //Hide save button and show update & delete button
            $("#updateEntryContainer").show();
            $("#saveEntryContainer").hide();

            $("#updateEntryContainer").attr("updateid", data.id);
        },

        loglistPageInit: function() {
            orga.logger.renderLogsList();
        },

        log: function(message) {
            console.log(message);
        },

        checkConnectivity: function() {
            if (navigator.onLine) {
                alert("Yaay... Your internet connection is working :)");
            } else {
                alert("Duh... You are not connected to the internt.");
            }
        },

        bookmarkApp: function() {
            if (window.sidebar && window.sidebar.addPanel) { // Mozilla Firefox Bookmark
                window.sidebar.addPanel(document.title, window.location.href, '');
            } else if (window.external && ('AddFavorite' in window.external)) { // IE Favorite
                window.external.AddFavorite(location.href, document.title);
            } else if (window.opera && window.print) { // Opera Hotlist
                this.title = document.title;
                return true;
            } else { // webkit - safari/chrome
                alert('Press ' + (navigator.userAgent.toLowerCase().indexOf('mac') != -1 ? 'Command/Cmd' : 'CTRL') + ' + D to bookmark this page.');
            }
        },

        isMobile: function() {
            return /Android/i.test(navigator.userAgent) || /iPhone|iPad|iPod/i.test(navigator.userAgent);
        },
    };
};

$(document).ready(function() {
    app.init();
    var addtohome = addToHomescreen({
        detectHomescreen: true,
        debug: false, // override browser checks
        displayPace: 0 // minutes before the message is shown again (0: display every time, default 24 hours)
    });

    $(document).ajaxStart(function() {
        $("#loading").show();
    });
    //addtohome.show();
});
