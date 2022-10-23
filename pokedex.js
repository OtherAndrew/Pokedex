/**
 * Andrew Nguyen
 * Homework 5: Pokedex
 * May 11, 2017
 * Updated: Oct. 22, 2022
 * 
 * This program handles the client-side scripting for a
 * site that hosts a Pokedex and a simplified version of
 * a Pokemon battle game. Requests are sent to a Pokedex
 * server to fetch information about the clicked Pokemon or
 * the game being played, and this program edits UI elements
 * accordingly based on that information.
 */

(function () {
    "use strict";
    
    var $ = function(id) { return document.getElementById(id); };
    var qs = function(sel) { return document.querySelector(sel); };
    var qsa = function(sel) { return document.querySelectorAll(sel); };
    
    var revealedPokemon; // list of found Pokemon
    var guid;            // unique game ID
    var pid;             // unique player ID
    var lowHP;           // threshold below which HP is considered low
    var fullHP;          // current Pokemon's "100% HP" value
    var gameURL;         // game URL
    var pokedexURL;      // pokedex URL
    
    /**
     * Initializes module-global variables, fills the Pokedex view,
     * and defines functionality for various buttons.
     */
    window.onload = function () {
        revealedPokemon = ["Bulbasaur", "Charmander", "Squirtle"];
        guid = "";
        pid = "";
        lowHP = 20;
        fullHP = 0;
        gameURL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/game.php";
        pokedexURL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/pokedex.php"
        fillPokedex();
        $("start-btn").onclick = startGame;
        $("endgame").onclick = endGame;
    };
    
    /**
     * Sends a request to the Pokedex server asking
     * for the contents of the Pokedex. Shows an error
     * message if the server was unable to provide the
     * required information.
     */
    function fillPokedex () {
        var ajax = new XMLHttpRequest();
        ajax.open("GET", pokedexURL + "?pokedex=all");
        ajax.onload = fillPokedexLoad;
        ajax.onerror = ajaxError;
        ajax.send();
    }
    
    /**
     * On a successful server call, fills the Pokedex view
     * with clickable Pokemon sprites using information 
     * from the Pokedex server. Shows an error message if 
     * the server was unable to provide the required information.
     */
    function fillPokedexLoad () {
        if (this.status >= 200 && this.status <= 299) {
            var pokeArray = this.responseText.split(/[\n:]/);
            for (var i = 0; i < pokeArray.length; i += 2) {
                var sprite = document.createElement("img");
                sprite.id = pokeArray[i];
                sprite.src = "sprites/" + pokeArray[i + 1] + ".png";
                sprite.alt = pokeArray[i];
                sprite.classList.add("sprite", "unfound");
                sprite.onclick = viewData;
                $("pokedex-view").appendChild(sprite);
            }
            showFound();
        } else {
            ajaxError();
        }
    }
    
    /**
     * Sends a request to the Pokedex server asking for
     * information about the Pokemon that was clicked.
     * Shows an error message if the server was unable to
     * provide the required information.
     */
    function viewData () {
        if (!this.classList.contains("unfound")) {
            var ajax = new XMLHttpRequest();
            ajax.open("GET", pokedexURL + "?pokemon=" + this.id);
            ajax.onload = function () {
                if (ajax.status >= 200 && ajax.status <= 299) {
                    viewDataLoad("#my-card", JSON.parse(ajax.responseText));
                } else {
                    ajaxError();
                }
            };
            ajax.onerror = ajaxError;
            ajax.send();
        }
    }
    
    /**
     * On a successful server call, fills a given Pokemon 
     * card view with information from the Pokedex server
     * about the provided "pokemon". If the given card view
     * belongs to the player, the "Choose This Pokemon!"
     * button will be shown.
     * 
     * @param card - the CSS selector of the card view to fill
     * @param pokemon - a Pokemon object, containing information
     * such as name, description, and moveset
     */
    function viewDataLoad (card, pokemon) {
        fullHP = pokemon.hp;
        var pokeMoves = pokemon.moves;
        var moveButtonList = qsa(card + " .moves button");
        var moveImageList = qsa(card + " .moves img");
        var moveNameList = qsa(card + " .move");
        var moveDamageList = qsa(card + " .dp");
        
        qs(card + " .name").innerHTML = pokemon.name;
        qs(card + " .pokepic").src = pokemon.images.photo;
        qs(card + " .type").src = pokemon.images.typeIcon;
        qs(card + " .weakness").src = pokemon.images.weaknessIcon;
        qs(card + " .hp").innerHTML = pokemon.hp + "HP";
        qs(card + " .info").innerHTML = pokemon.info.description;
        
        for (var i = 0; i < moveButtonList.length; i++) {
            if (i < pokeMoves.length) {
                moveButtonList[i].classList.remove("hidden");
                moveButtonList[i].id = pokeMoves[i].name;
                moveImageList[i].src = "icons/" + pokeMoves[i].type + ".jpg";
                moveNameList[i].innerText = pokeMoves[i].name;
                if (pokeMoves[i].dp !== undefined) {
                    moveDamageList[i].innerHTML = pokeMoves[i].dp + " DP";
                } else {
                    moveDamageList[i].innerHTML = "";
                }
            } else {
                moveButtonList[i].classList.add("hidden");
            }
        }
        if (card == "#my-card") {
            $("start-btn").classList.remove("hidden");
        }
    }
    
    /**
     * Sends a request to the Pokedex server asking for
     * information about this particular game state.
     * Shows an error message if the server was unable
     * to provide the required information.
     */
    function startGame () {
        var ajax = new XMLHttpRequest();
        var pokeName = qs("#my-card .name").innerHTML.toLowerCase();
        ajax.open("POST", gameURL);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        ajax.onload = startGameLoad;
        ajax.onerror = ajaxError;
        ajax.send("startgame=true&mypokemon=" + pokeName);
    }
    
    /**
     * On a successful server call, initializes the game
     * state of the page by toggling several UI elements.
     * Shows an error message if the server was unable to
     * provide the required information.
     */
    function startGameLoad () {
        if (this.status >= 200 && this.status <= 299) {
            var gameData = JSON.parse(this.responseText);
            $("title").innerHTML = "Pokemon Battle Mode!";
            $("endgame").classList.add("hidden");
            gameModeToggle();
            enableMoveButtons();
            guid = gameData.guid;
            pid = gameData.pid;
            viewDataLoad("#their-card", gameData.p2);         
        } else {
            ajaxError();
        }
    }
    
    /**
     * Sends a request to the Pokedex server asking for
     * the results of the move that the player has just
     * played. Shows an error message if the server was
     * unable to provide the required information.
     */
    function playMove () {
        disableMoveButtons();
        $("loading").classList.remove("hidden");
        var moveName = this.id.toLowerCase().replace(/ /g, "");
        var ajax = new XMLHttpRequest();
        ajax.open("POST", gameURL);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        ajax.onload = playMoveLoad;
        ajax.onerror = ajaxError;
        ajax.send("guid=" + guid + "&pid=" + pid + "&movename=" + moveName);
    }
    
    /**
     * Sends a request to the Pokedex server telling
     * it that the player wishes to flee the battle,
     * forcing a loss. Shows an error message if the 
     * server was unable to provide the required
     * information.
     */
    function fleeGame () {
        disableMoveButtons();
        $("loading").classList.remove("hidden");
        var ajax = new XMLHttpRequest();
        ajax.open("POST", gameURL);
        ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        ajax.onload = playMoveLoad;
        ajax.onerror = ajaxError;
        ajax.send("move=flee&guid=" + guid + "&pid=" + pid);
    }
    
    /**
     * On a successful server call, displays the results
     * of the player's move along with the results of the
     * opponent's move. Shows an error message if the server
     * was unable to provide the required information.
     */
    function playMoveLoad () {
        var result = JSON.parse(this.responseText);
        var myHpPercent = Math.round(result.p1["current-hp"] / result.p1.hp * 100);
        var theirHpPercent = Math.round(result.p2["current-hp"] / result.p2.hp * 100);
        
        applyResults("#my-card", result.p1, myHpPercent);
        applyResults("#their-card", result.p2, theirHpPercent);
        $("p1-turn-results").innerHTML = "Player 1 played " + result.results["p1-move"] +
            " and " + result.results["p1-result"];
        appendMessage($("p1-turn-results"), result.results["p1-result"]);
        if (result.results["p2-move"] != "" && theirHpPercent != 0) {
            $("p2-turn-results").innerHTML = "Player 2 played " + result.results["p2-move"] +
                " and " + result.results["p2-result"];
            appendMessage($("p2-turn-results"), result.results["p2-result"]);
        } else {
            $("p2-turn-results").innerHTML = "";
        }
        if (myHpPercent == 0) {
            $("title").innerHTML = "You lost!";
            $("endgame").classList.remove("hidden");
        } else if (theirHpPercent == 0) {
            $("title").innerHTML = "You won!";
            $("endgame").classList.remove("hidden");
            if (!revealedPokemon.includes(result.p2.name)) {
                revealedPokemon.push(result.p2.name);
            }
        } else {
            enableMoveButtons();
        }
        $("loading").classList.add("hidden");
    }
    
    /**
     * Reverts the page to Pokedex view state and resets
     * various UI elements.
     */
    function endGame () {
        $("title").innerHTML = "Pokedex";
        $("p1-turn-results").innerHTML = "";
        $("p2-turn-results").innerHTML = "";
        qs("#my-card .buffs").innerHTML = "";
        qs("#my-card .health-bar").style.width = "100%";
        qs("#my-card .health-bar").classList.remove("low-health");
        qs("#my-card .hp").innerHTML = fullHP + "HP";
        qs("#their-card .buffs").innerHTML = "";
        qs("#their-card .health-bar").style.width = "100%";
        qs("#their-card .health-bar").classList.remove("low-health");
        gameModeToggle();
        showFound();
    }
    
    /**
     * Displays an alert containing the status code of the error
     * and response text if provided.
     */
    function ajaxError () {
        alert("There was a problem.\n\n" +
            "Status: " + this.status +
            "\nResponse: " + this.responseText);
        if (!qs("#their-card").classList.contains("hidden")) {
            enableMoveButtons();
        }
        $("loading").classList.add("hidden");
    }
    
    /**
     * Reveals all Pokemon in the Pokedex view that have been
     * found so far.
     */
    function showFound () {
        for (var i = 0; i < revealedPokemon.length; i++) {
            $(revealedPokemon[i]).classList.remove("unfound");
        }
    }
    
    /**
     * Toggles the appearance of several UI elements to change
     * the view from "Pokedex Mode" to "Game Mode" and vice versa.
     */
    function gameModeToggle () {
        $("pokedex-view").classList.toggle("hidden");
        $("start-btn").classList.toggle("hidden");
        $("flee-btn").classList.toggle("hidden");
        $("their-card").classList.toggle("hidden");
        $("results-container").classList.toggle("hidden");
        $("p1-turn-results").classList.toggle("hidden");
        $("p2-turn-results").classList.toggle("hidden");
        qs("#my-card .hp-info").classList.toggle("hidden");
        qs("#my-card .buffs").classList.toggle("hidden");
    }
    
    /**
     * Applies the provided "playerResult" information to
     * various UI elements associated with the given "card".
     * 
     * @param card - CSS selector for the card that the results
     * are being applied to
     * @param playerResult - object containing the move results
     * for the given card
     * @param hpPercent - current health percentage for the
     * given card
     */
    function applyResults (card, playerResult, hpPercent) {
        qs(card + " .buffs").innerHTML = "";
        applyBuffs(card, playerResult.buffs, "buff");
        applyBuffs(card, playerResult.debuffs, "debuff");
        qs(card + " .hp").innerHTML = playerResult["current-hp"] + "HP";
        qs(card + " .health-bar").style.width = hpPercent.toString() + "%";
        if (hpPercent <= lowHP) {
            qs(card + " .health-bar").classList.add("low-health");
        } else {
            qs(card + " .health-bar").classList.remove("low-health");
        }
    }
   
    /**
     * Displays the icons of the given buff "type" inside
     * "playerBuffs" next to the given "card".
     * 
     * @param card - CSS selector for the card that the buffs
     * are being applied to
     * @param playerBuffs - buffs or debuffs for the given card
     * @param type - either "buff" or "debuff"
     */
    function applyBuffs (card, playerBuffs, type) {
        if (playerBuffs[0] != "") {
            for (var i = 0; i < playerBuffs.length; i++) {
                var buff = document.createElement("div");
                buff.classList.add(playerBuffs[i]);
                buff.classList.add(type);
                qs(card + " .buffs").appendChild(buff);
            }
        }
    }
    
    /**
     * Checks if the move missed or not ("moveResult"), and
     * appends the message in "resultContainer" accordingly
     * to make sense.
     * 
     * @param resultContainer - div container displaying move results
     * @param moveResult - either "hit", "miss", or "lost"
     */
    function appendMessage (resultContainer, moveResult) {
        if (moveResult == "miss") {
            resultContainer.innerHTML += "ed!";
        } else {
            resultContainer.innerHTML += "!";
        }
    }
    
    /**
     * Adds functionality to the player's move buttons
     * when called.
     */
    function enableMoveButtons () {
        var moveButtonList = qsa("#my-card .moves button");
        $("flee-btn").onclick = fleeGame;
        for (var i = 0; i < moveButtonList.length; i++) {
            moveButtonList[i].onclick = playMove;
        }
    }
    
    /**
     * Removes functionality from the player's move
     * buttons when called.
     */
    function disableMoveButtons () {
        var moveButtonList = qsa("#my-card .moves button");
        $("flee-btn").onclick = null;
        for (var i = 0; i < moveButtonList.length; i++) {
            moveButtonList[i].onclick = null;
        }
    }

})();
