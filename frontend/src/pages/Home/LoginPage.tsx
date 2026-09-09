import { Nav } from '../../components/Nav'
import { LoginButton } from '../../components/LoginButton'
import { LoginSpinDemo } from './SpinDemo'

export function LoginPage() {
	return (
	  <>
		<Nav showLogin={true}/>
		<div className="max-w-2xl mx-auto px-4 py-8">
			
			<h1>Welcome to All Things Book Club</h1>
			<h4>A place to share what facinates you, hear new ideas, and make new friends.</h4>
		</div>
		<div className="flex justify-center mb-8">
			<LoginButton variant="prominent" />
		</div>
		<div className="flex flex-col items-center bg-cream px-6 py-12">
			<LoginSpinDemo />
		</div>
		<div className="max-w-2xl mx-auto">
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3>How does it work?</h3>
				<p className="py-2">
					We all have things that facinate us and want to tell someone about.  
					It could be a book, a movie, a podcast, a conversation, or even a meme.
					All Things Book Club is a chance to share about those topics with everyone's wrapped attention. 
				</p>
				<ol className="py-2">  The process is simple:
					<li className="pl-4">1. Each member adds their topic of interest to the wheel.</li>
					<li className="pl-4">2. Someone spins the wheel and it randomly selects a topic.</li>
					<li className="pl-4">3. The person who selected the topic gets a couple minutes to share what facinates them about it.</li>
					<li className="pl-4">4. Then the discussion opens to the group for a couple more minutes.</li>
					<li className="pl-4">5. Once conversation on the topic has slowed, spin again to repeat with a new topic.</li>
				</ol>
				<p className="py-2">Everyone gets to share and everyone is listened to.</p>
				<p className="py-2">Each meeting and its topics are stored in our end-to-end encrypted database so you can revisit any interesting topics anytime you want.</p>
				<p className="py-2">Join today!</p>
			</div>
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3 className="text-white">Want to dig deeper?</h3>
				<p className="py-2">Have a community of collaborators, researchers, or creators that you want to develop a deeper <a className="text-terracotta hover:text-terracotta-dark underline break-all" href="https://en.wiktionary.org/wiki/scenius">scenious</a> with?</p>
				<p className="py-2">Create an All Things Book Club Chapter today and deepen your investigations and explorations together!</p>
			</div>
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3 className="text-white">What about privacy?</h3>
				<p className="py-2">Your ideas are yours. We don't want to know. That's why all collected with your Book Club Chapter is end-to-end encrypted so that it is server-blind.  Meaning we couldn't look at it even if we tried. To learn more, visit our <a className="text-terracotta hover:text-terracotta-dark underline break-all" href='/privacy'>privacy page</a>.</p>
			</div>
		</div>
	  </>
	)
}
