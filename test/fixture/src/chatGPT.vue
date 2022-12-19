<template>
  <div>
    <button @click="startListening">Start listening</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      recognition: null,
      listening: false,
    };
  },
  methods: {
    startListening() {
      // Pedir permiso al usuario para acceder al micrófono
      navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          // Crear una instancia de SpeechRecognition
          this.recognition = new SpeechRecognition();
          // Configurar la instancia
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';
          // Al recibir un resultado, procesar la entrada de audio
          this.recognition.addEventListener('result', (event) => {
            const results = event.results;
            const command = results[results.length - 1][0].transcript;
            // Si se dice "Jarvis, wait for a spoken command", esperar a la siguiente instrucción hablada
            if (command === 'Jarvis, wait for a spoken command') {
              this.listening = true;
            }
            // Si se está a la escucha de instrucciones habladas, procesar la siguiente instrucción
            if (this.listening) {
              this.listening = false;
              // Llamar al servidor para obtener una respuesta utilizando el chatGPT
              fetch('/api/chat', {
                method: 'POST',
                body: command,
              }).then((response) => response.text()).then((responseText) => {
                // Reproducir la respuesta en voz alta utilizando la API de síntesis de voz
                const synth = window.speechSynthesis;
                const utterance = new SpeechSynthesisUtterance(responseText);
                synth.speak(utterance);
                // Actualizar el contenido de la página con la respuesta obtenida
                this.$el.innerHTML = responseText;
              });
            }
          });
          // Comenzar a escuchar
          this.recognition.start();
        } else {
          console.error('Permission to access microphone was denied');
        }
      });
    },
  },
};
</script>